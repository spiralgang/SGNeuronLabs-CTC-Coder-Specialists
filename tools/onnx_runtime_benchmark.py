"""
Benchmark ONNX models on CPU/GPU using onnxruntime, print latency/throughput.
References: Vault: /reference (onnxruntime, NumPy, time, mobile Python)
"""
import onnxruntime as ort
import numpy as np
import time, argparse

def benchmark(onnx_path, input_shape, runs):
    session = ort.InferenceSession(onnx_path)
    input_name = session.get_inputs()[0].name
    inp = np.random.rand(*input_shape).astype(np.float32)
    # Warmup
    for _ in range(5):
        session.run(None, {input_name: inp})
    times = []
    for _ in range(runs):
        start = time.time()
        session.run(None, {input_name: inp})
        times.append(time.time() - start)
    print(f"Mean latency: {np.mean(times)*1000:.2f} ms | Throughput: {runs/np.sum(times):.2f} samples/sec")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("onnx_path")
    parser.add_argument("--input-shape", nargs="+", type=int, default=[1,3,224,224])
    parser.add_argument("--runs", type=int, default=50)
    args = parser.parse_args()
    benchmark(args.onnx_path, tuple(args.input_shape), args.runs)

# References: Vault: /reference (onnxruntime, NumPy, time)
