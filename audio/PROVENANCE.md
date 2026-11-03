Web copies of SHAHANSHAH's narrator clips, re-encoded from the game's Ogg Vorbis to Opus 16 kbps mono. manifest.json holds the SHA-1 of the words each clip says. The game's provenance follows.

# Narrator voice

Speech synthesized on 2026-11-03 by `tools/narrator_voice/voice.py` from the
narrator's lines (`tools/narrator_voice/lines.json`, dumped from the game by
`dump_lines.gd`): each Encyclopedia topic's card line (`Narrator.line`) and each
level's founding line (`FoundingShot`). One Ogg Vorbis clip per line,
`<locale>/<key>.ogg`; `<locale>/manifest.json` holds the SHA-1 of the words each
clip says, and the game stays silent for a line whose words have changed since.
Clips are levelled to one loudness (RMS about -22 dBFS) and encoded mono.

No human voice was recorded or cloned. The owner picked George for English and
Gyro for Farsi by ear on 2026-11-03; the other languages' voices were picked
by Claude.

| Language | Engine | Voice | Model licence | Training data licence |
|---|---|---|---|---|
| en | Kokoro v1.0 | bm_george | Apache-2.0 | (model weights released under Apache-2.0) |
| es | Kokoro v1.0 | em_alex | Apache-2.0 | as above |
| fr | Kokoro v1.0 | ff_siwis | Apache-2.0 | as above |
| it | Kokoro v1.0 | im_nicola | Apache-2.0 | as above |
| pt_BR | Kokoro v1.0 | pm_alex | Apache-2.0 | as above |
| ja | Kokoro v1.0 (misaki phonemes) | jm_kumo | Apache-2.0 | as above |
| zh_CN | Kokoro v1.0 (misaki phonemes) | zm_yunxi | Apache-2.0 | as above |
| de | Piper | de_DE-thorsten-medium | MIT | Thorsten-Voice, CC0 |
| ru | Piper | ru_RU-dmitri-medium | MIT | OHF-Voice voice-datasets, CC0 |
| fa | Piper | fa_IR-gyro-medium | MIT (gyroing/Persian-Piper-Model-gyro) | Persian TTS dataset (male), Magnoliasis on Kaggle, CC0 |
| ar, tr, ko | Chatterbox Multilingual (Resemble AI) | George's timbre from `tools/narrator_voice/reference_george.wav` (itself Kokoro bm_george) | MIT | (model weights released under MIT) |

Sources:
- Kokoro-82M: https://huggingface.co/hexgrad/Kokoro-82M (Apache-2.0); ONNX
  export and voices file from https://github.com/thewh1teagle/kokoro-onnx
  release `model-files-v1.0` (MIT).
- Piper voices: https://huggingface.co/rhasspy/piper-voices (MIT); dataset
  licences from each voice's MODEL_CARD, gyro's from
  https://huggingface.co/gyroing/Persian-Piper-Model-gyro and
  https://www.kaggle.com/datasets/magnoliasis/persian-tts-dataset-male.
- Chatterbox: https://github.com/resemble-ai/chatterbox (MIT). Its output
  carries Resemble's inaudible Perth watermark.

Rejected for licence: Piper's ar_JO-kareem (dataset unlicensed), tr_TR-dfki,
ko_KR-kss, ja_JP-hi_fi_captain and ru_RU-ruslan (Creative Commons non-commercial, NC-SA), zh_CN-huayan
(unknown).
