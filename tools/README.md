# Flatpak Reference: org.gnome.Boxes

## Purpose
Enable easy installation of [GNOME Boxes](https://flathub.org/apps/org.gnome.Boxes) for VM and remote desktop management, supporting cross-platform dev/test workflows.

## Installation

```bash
# Ensure flatpak and flathub are set up
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Boxes from this repo (local file)
flatpak install --user tools/org.gnome.Boxes.flatpakref
```
Or directly from Flathub:
```bash
flatpak install flathub org.gnome.Boxes
```

## References
- Vault: /reference (Flatpak, Flathub, Linux sandboxing, userland best practices)
- [Flatpak Documentation](https://docs.flatpak.org/)
- [Flathub - GNOME Boxes](https://flathub.org/apps/org.gnome.Boxes)
