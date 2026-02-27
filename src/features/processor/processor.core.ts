import type { AudioFormat } from '../settings/settings.types';
import type {
  ProcessTask,
  ProcessorSettingsSnapshot,
  TaskStatus,
} from './processor.types';

interface AudioCommandBuilder {
  input(path: string): AudioCommandBuilder;
  output(path: string): AudioCommandBuilder;
  loudnorm(settings: {
    integrated: number;
    truePeak: number;
    lra: number;
  }): AudioCommandBuilder;
  setFormat(format: AudioFormat): AudioCommandBuilder;
  build(): string[];
}

interface ProcessorDependencies {
  dirname(path: string): Promise<string>;
  join(...paths: string[]): Promise<string>;
  basename(path: string): Promise<string>;
  extname(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  copyFile(fromPath: string, toPath: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  createCommandBuilder(): AudioCommandBuilder;
  runFFmpeg(args: string[], onProgress?: (line: string) => void): Promise<void>;
}

interface ProcessTaskExecutionResult {
  status: TaskStatus;
  error?: string;
  progress?: string;
}

export async function executeTask(
  task: ProcessTask,
  settings: ProcessorSettingsSnapshot,
  deps: ProcessorDependencies,
  onProgress?: (line: string) => void
): Promise<ProcessTaskExecutionResult> {
  try {
    const outputPath = await resolveOutputPath(task.file, settings, deps);
    if (!outputPath) {
      return { status: 'completed', progress: 'Skipped (file exists)' };
    }

    if (settings.renameOnly) {
      await deps.copyFile(task.file, outputPath);
      return { status: 'completed' };
    }

    const builder = deps.createCommandBuilder();
    builder.input(task.file);

    if (settings.loudness.enabled) {
      builder.loudnorm(settings.loudness);
    }

    builder.setFormat(settings.format);
    builder.output(outputPath);

    await deps.runFFmpeg(builder.build(), onProgress);
    return { status: 'completed' };
  } catch (error) {
    return { status: 'failed', error: String(error) };
  }
}

export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const activeWorkers = new Set<Promise<void>>();

  for (const item of items) {
    const work = worker(item).finally(() => {
      activeWorkers.delete(work);
    });

    activeWorkers.add(work);
    if (activeWorkers.size >= Math.max(limit, 1)) {
      await Promise.race(activeWorkers);
    }
  }

  await Promise.all(activeWorkers);
}

async function resolveOutputPath(
  inputPath: string,
  settings: ProcessorSettingsSnapshot,
  deps: ProcessorDependencies
): Promise<string | null> {
  const outputDir = await resolveOutputDirectory(inputPath, settings, deps);
  await deps.mkdir(outputDir);

  const originalName = await deps.basename(inputPath);
  const originalExt = await deps.extname(inputPath);
  const nameWithoutExt =
    originalExt.length > 0 ? originalName.slice(0, -originalExt.length) : originalName;
  const targetExt = settings.renameOnly ? originalExt : `.${settings.format}`;

  let counter = 0;
  while (true) {
    const suffix = counter > 0 ? ` (${counter})` : '';
    const filename =
      `${settings.filenamePrefix}${nameWithoutExt}${settings.filenameSuffix}` +
      `${settings.overwriteMode === 'rename' ? suffix : ''}${targetExt}`;
    const outputPath = await deps.join(outputDir, filename);

    if (!(await deps.exists(outputPath))) {
      return outputPath;
    }
    if (settings.overwriteMode === 'overwrite') {
      return outputPath;
    }
    if (settings.overwriteMode === 'skip') {
      return null;
    }
    counter += 1;
  }
}

async function resolveOutputDirectory(
  inputPath: string,
  settings: ProcessorSettingsSnapshot,
  deps: ProcessorDependencies
): Promise<string> {
  if (settings.outputMode === 'custom-folder' && settings.customOutputPath) {
    return settings.customOutputPath;
  }
  const sourceDirectory = await deps.dirname(inputPath);
  return deps.join(sourceDirectory, 'processed');
}
