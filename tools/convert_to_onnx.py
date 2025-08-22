"""
Convert a PyTorch model checkpoint to ONNX format.
References: Vault: /reference (PyTorch, ONNX, model export best practices)
"""
import torch, argparse

def export(model_path, output_path, input_shape):
    model = torch.load(model_path, map_location='cpu')
    model.eval()
    dummy_input = torch.randn(*input_shape)
    torch.onnx.export(model, dummy_input, output_path,
                      export_params=True, opset_version=12)
    print(f"Exported {model_path} to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("model_path")
    parser.add_argument("output_path")
    parser.add_argument("--input-shape", nargs="+", type=int, default=[1,3,224,224])
    args = parser.parse_args()
    export(args.model_path, args.output_path, tuple(args.input_shape))

# References: Vault: /reference (PyTorch, ONNX export)
