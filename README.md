# Audio Generation Loss

## A few links

- https://en.wikipedia.org/wiki/Generation_loss
- https://ffmpeg.org/ffmpeg-filters.html#showwavespic

## Example Commands

#### Generate sine waves

```bash
sox -n sine440.wav rate 44.1k synth 1 sine 440
sox -n sine441.wav rate 44.1k synth 1 sine 441
```

#### Generate Spectrogram

```bash
sox sine440.wav -n spectrogram -o spectrogram-1.png
```

#### Generate Waveform

```bash
ffmpeg -y -i sine440.wav -filter_complex "showwavespic" -frames:v 1 waveform-1.png
```

```bash
ffmpeg -y -i sine440.wav -filter_complex "showwavespic=s=600x120:colors=white,negate[a];color=black:600x120[c];[c][a]alphamerge" waveform-1.png
```

```bash
ffmpeg -y -i sine440.wav -filter_complex "showwavespic=colors=steelblue" -frames:v 1 waveform-1.png
```
