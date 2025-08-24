#!/usr/bin/env python3
"""
Local model runner script for GitHub Agent
"""
import argparse
import json
import sys
import os
from typing import Dict, List, Any

def parse_args():
    parser = argparse.ArgumentParser(description='Run inference on local models')
    parser.add_argument('--model-path', type=str, required=True, help='Path to model directory')
    parser.add_argument('--max-tokens', type=int, default=1000, help='Maximum tokens to generate')
    parser.add_argument('--temperature', type=float, default=0.7, help='Generation temperature')
    return parser.parse_args()

def load_model(model_path: str):
    """
    Load the appropriate model based on the model path
    """
    try:
        # Check if transformers is available
        import transformers
        from transformers import AutoModelForCausalLM, AutoTokenizer
        
        print(f"Loading model from {model_path}", file=sys.stderr)
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            device_map="auto",
            torch_dtype="auto",
            trust_remote_code=True
        )
        print(f"Model loaded successfully", file=sys.stderr)
        
        return model, tokenizer
    except ImportError:
        print("Failed to import transformers library", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Failed to load model: {str(e)}", file=sys.stderr)
        sys.exit(1)

def run_inference(model, tokenizer, input_data: Dict[str, Any], max_tokens: int, temperature: float):
    """
    Run inference on the loaded model
    """
    try:
        prompt = input_data.get("prompt", "")
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        
        # Count input tokens
        input_tokens = len(inputs.input_ids[0])
        
        # Generate response
        outputs = model.generate(
            inputs.input_ids,
            max_new_tokens=max_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            pad_token_id=tokenizer.eos_token_id
        )
        
        # Decode output and remove prompt
        output_ids = outputs[0][inputs.input_ids.shape[1]:]
        response_text = tokenizer.decode(output_ids, skip_special_tokens=True)
        
        # Count output tokens
        output_tokens = len(output_ids)
        
        return {
            "text": response_text,
            "usage": {
                "prompt_tokens": input_tokens,
                "completion_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens
            }
        }
    except Exception as e:
        print(f"Inference error: {str(e)}", file=sys.stderr)
        return {"text": f"Error: {str(e)}", "usage": {}}

def main():
    args = parse_args()
    
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    
    # Load model
    model, tokenizer = load_model(args.model_path)
    
    # Run inference
    result = run_inference(model, tokenizer, input_data, args.max_tokens, args.temperature)
    
    # Return result as JSON
    print(json.dumps(result))

if __name__ == "__main__":
    main()