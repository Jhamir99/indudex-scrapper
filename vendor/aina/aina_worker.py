"""Projecte Aina's Spanish to Catalan model (Barcelona Supercomputing Center, Apache-2.0) with CTranslate2, for
builder/mt/aina.mjs: one JSON-quoted text a line in, one Catalan text a line out, in the same order.
   python -I aina_worker.py <model folder> [threads] < in.jsonl > out.jsonl"""
import json
import sys
from pathlib import Path

import ctranslate2
import sentencepiece

sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
model = Path(sys.argv[1])
threads = int(sys.argv[2]) if len(sys.argv) > 2 else 1
pieces = sentencepiece.SentencePieceProcessor(model_file=str(model / 'spm.model'))
translator = ctranslate2.Translator(str(model), device='cpu', compute_type='int8', intra_threads=threads)
texts = [json.loads(line) for line in sys.stdin if line.strip()]
results = translator.translate_batch([pieces.encode(t, out_type=str) for t in texts], beam_size=4,
                                     max_batch_size=32, max_decoding_length=256)
for r in results:
    print(json.dumps(pieces.decode(r.hypotheses[0]), ensure_ascii=False))
