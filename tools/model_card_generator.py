"""
Generate a minimal model card in Markdown from model metadata.
References: Vault: /reference (Hugging Face, MLCommons, Markdown, mobile compatibility)
"""
import argparse

def generate_card(model_name, description, license):
    md = f"""# Model Card: {model_name}

**Description:**  
{description}

**License:**  
{license}

**References:**  
- Vault: /reference (Model cards, documentation)
"""
    with open(f"{model_name}_model_card.md", "w") as f:
        f.write(md)
    print(f"Generated model card: {model_name}_model_card.md")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("model_name")
    parser.add_argument("description")
    parser.add_argument("license")
    args = parser.parse_args()
    generate_card(args.model_name, args.description, args.license)

# References: Vault: /reference (Model cards, Markdown)
