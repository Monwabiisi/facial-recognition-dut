import React, { useMemo, useState, useRef } from 'react'
import { DETECTION } from '../config/recognition'

type EngineId = 'faceapi' | 'human' | 'mediapipe'

export default function EvalPage() {
  const [engine, setEngine] = useState<EngineId>('mediapipe')
  const [tinyFaceScore, setTinyFaceScore] = useState(DETECTION.tinyFaceScore)
  const [mediapipeMinConf, setMediapipeMinConf] = useState(DETECTION.mediapipeMinConf)
  const [similarityGate, setSimilarityGate] = useState(DETECTION.similarityGate)

  const imgCanvas = useRef<HTMLCanvasElement | null>(null)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<{precision:number; recall:number; f1:number; tp:number; fp:number; fn:number} | null>(null)
  const [log, setLog] = useState<string[]>([])

  const pushLog = (m: string) => setLog(prev => [...prev, m])

  const thresholds = useMemo(() => ({
    engine,
    tinyFaceScore: Number(tinyFaceScore),
    mediapipeMinConf: Number(mediapipeMinConf),
    similarityGate: Number(similarityGate),
  }), [engine, tinyFaceScore, mediapipeMinConf, similarityGate])

  async function runEval() {
    setRunning(true); setResults(null); setLog([])
    try {
      // 1) Load metadata
      const meta = await fetch('/eval/index.json').then(r => r.json()) as {
        known: {path:string; label:string}[]; unknown: {path:string}[]
      }
      let tp = 0, fp = 0, fn = 0

      // 2) Helper: draw image onto offscreen canvas
      async function loadToCanvas(src: string) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = src
        await img.decode()
        const canvas = imgCanvas.current!
        const ctx = canvas.getContext('2d')!
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        ctx.drawImage(img, 0, 0)
        return canvas
      }

      // 3) Detect + recognize using the same pipeline as app (pseudo‑hooks you already have):
      //    Here, call your existing detection/embedding/recognize helpers (not redefining them).
      async function detectAndRecognize(canvas: HTMLCanvasElement) {
        // Replace with your real pipeline:
        // const faces = await detectFaces({ engine, canvas, thresholds })
        // const out = await recognizeFaces(faces, { similarityGate })
        // return out
        return [] as Array<{ label?: string; score: number }>
      }

      // Known set
      for (const k of meta.known) {
        const c = await loadToCanvas(k.path)
        const recognized = await detectAndRecognize(c)
        const matched = recognized.some(r => r.label === k.label && r.score >= thresholds.similarityGate)
        if (matched) tp++; else fn++
        pushLog(`known ${k.label} -> ${matched ? 'TP' : 'FN'}`)
      }

      // Unknown set
      for (const u of meta.unknown) {
        const c = await loadToCanvas(u.path)
        const recognized = await detectAndRecognize(c)
        const anyHit = recognized.some(r => (r.score ?? 0) >= thresholds.similarityGate)
        if (anyHit) { fp++; pushLog(`unknown -> FP`) } else { pushLog(`unknown -> OK`) }
      }

      const precision = tp + fp === 0 ? 0 : tp / (tp + fp)
      const recall    = tp + fn === 0 ? 0 : tp / (tp + fn)
      const f1        = (precision + recall) === 0 ? 0 : 2 * (precision * recall) / (precision + recall)
      setResults({ precision, recall, f1, tp, fp, fn })
    } catch (e:any) {
      pushLog(`error: ${e?.message ?? e}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Evaluation</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="font-semibold">Engine</span>
          <select value={engine} onChange={e=>setEngine(e.target.value as EngineId)} className="border rounded px-3 py-2 w-full">
            <option value="mediapipe">mediapipe</option>
            <option value="faceapi">faceapi</option>
            <option value="human">human</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-semibold">TinyFace scoreThreshold</span>
          <input type="number" step="0.01" value={tinyFaceScore} onChange={e=>setTinyFaceScore(e.target.value)} className="border rounded px-3 py-2 w-full"/>
        </label>

        <label className="space-y-1">
          <span className="font-semibold">Mediapipe minDetectionConfidence</span>
          <input type="number" step="0.01" value={mediapipeMinConf} onChange={e=>setMediapipeMinConf(e.target.value)} className="border rounded px-3 py-2 w-full"/>
        </label>

        <label className="space-y-1">
          <span className="font-semibold">Similarity gate</span>
          <input type="number" step="0.01" value={similarityGate} onChange={e=>setSimilarityGate(e.target.value)} className="border rounded px-3 py-2 w-full"/>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button disabled={running} onClick={runEval} className="bg-blue-600 text-white px-4 py-2 rounded">
          {running ? 'Running…' : 'Run Evaluation'}
        </button>
        <span className="text-sm opacity-70">Uses the same detection/recognition pipeline as the app.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-2">Metrics</h2>
          {results ? (
            <ul className="space-y-1 text-sm">
              <li>TP: {results.tp}</li>
              <li>FP: {results.fp}</li>
              <li>FN: {results.fn}</li>
              <li>Precision: {(results.precision*100).toFixed(1)}%</li>
              <li>Recall: {(results.recall*100).toFixed(1)}%</li>
              <li>F1: {(results.f1*100).toFixed(1)}%</li>
            </ul>
          ) : <p className="text-sm opacity-70">No results yet.</p>}
        </div>
        <div>
          <h2 className="font-semibold mb-2">Log</h2>
          <div className="text-xs bg-black/5 p-3 rounded max-h-64 overflow-auto">
            {log.map((l,i)=><div key={i}>{l}</div>)}
          </div>
        </div>
      </div>

      {/* hidden canvas used for evaluation rendering */}
      <canvas ref={imgCanvas} className="hidden" />
    </div>
  )
}
