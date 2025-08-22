"""
Run batch inference on a folder of images using a PyTorch model. Outputs results as CSV.
References: Vault: /reference (PyTorch, PIL, NumPy, CSV, mobile Python)
"""
import torch, os, csv, argparse
from PIL import Image
import numpy as np

def preprocess(img_path, input_shape):
    img = Image.open(img_path).resize((input_shape[2], input_shape[3]))
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.transpose(arr, (2, 0, 1))  # HWC -> CHW
    arr = np.expand_dims(arr, axis=0)
    return torch.tensor(arr)

def run_inference(model_path, data_dir, output_csv, input_shape):
    model = torch.load(model_path, map_location='cpu')
    model.eval()
    rows = []
    for fname in os.listdir(data_dir):
        if not fname.lower().endswith((".jpg", ".png")):
            continue
        input_tensor = preprocess(os.path.join(data_dir, fname), input_shape)
        with torch.no_grad():
            out = model(input_tensor)
            pred = torch.argmax(out, dim=1).item()
            rows.append([fname, pred])
    with open(output_csv, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["filename", "prediction"])
        writer.writerows(rows)
    print(f"Wrote batch inference results to {output_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("model_path")
    parser.add_argument("data_dir")
    parser.add_argument("output_csv")
    parser.add_argument("--input-shape", nargs="+", type=int, default=[1,3,224,224])
    args = parser.parse_args()
    run_inference(args.model_path, args.data_dir, args.output_csv, tuple(args.input_shape))

# References: Vault: /reference (PyTorch, PIL, NumPy, CSV)
