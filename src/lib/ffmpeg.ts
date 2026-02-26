import { Command } from '@tauri-apps/plugin-shell';

export class FFmpegCommandBuilder {
  private args: string[] = [];

  constructor() {
    this.args.push('-y'); // Overwrite output files
  }

  input(path: string): FFmpegCommandBuilder {
    this.args.push('-i', path);
    return this;
  }

  output(path: string): FFmpegCommandBuilder {
    this.args.push(path);
    return this;
  }

  codec(type: 'a' | 'v', codec: string): FFmpegCommandBuilder {
    this.args.push(`-c:${type}`, codec);
    return this;
  }
  
  loudnorm(settings: { integrated: number; truePeak: number; lra: number }): FFmpegCommandBuilder {
      this.args.push('-af', `loudnorm=I=${settings.integrated}:TP=${settings.truePeak}:LRA=${settings.lra}`);
      return this;
  }

  setFormat(format: 'wav' | 'mp3' | 'aac' | 'ogg'): FFmpegCommandBuilder {
    switch (format) {
      case 'mp3':
        this.args.push('-c:a', 'libmp3lame', '-b:a', '320k');
        break;
      case 'aac':
        this.args.push('-c:a', 'aac', '-b:a', '256k');
        break;
      case 'ogg':
        this.args.push('-c:a', 'libvorbis', '-q:a', '6');
        break;
      case 'wav':
      default:
        // WAV defaults to pcm_s16le usually, but let's be explicit to ensure compatibility
        this.args.push('-c:a', 'pcm_s16le');
        break;
    }
    return this;
  }

  build(): string[] {
    return this.args;
  }
}

export function runFFmpeg(args: string[], onProgress?: (line: string) => void): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const command = Command.sidecar('ffmpeg', args);
            
            command.on('close', (data) => {
                if (data.code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg exited with code ${data.code}`));
                }
            });
            
            command.on('error', (error) => reject(error));
            
            command.stderr.on('data', (line) => {
                if (onProgress) onProgress(line);
            });

            await command.spawn();
        } catch (e) {
            reject(e);
        }
    });
}
