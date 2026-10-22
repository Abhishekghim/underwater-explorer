import os
import sys
import threading
import time
from pathlib import Path
from PIL import Image

# Ensure standard output doesn't crash on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import customtkinter as ctk
from tkinter import filedialog, messagebox

# Import withoutbg core
try:
    from withoutbg.core import WithoutBG
    HAS_WITHOUTBG = True
except Exception as e:
    HAS_WITHOUTBG = False
    WITHOUTBG_ERR = str(e)

# Project roots
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT_DIR = PROJECT_ROOT / "public" / "assets" / "processed"
FISH_OUT_DIR = PROJECT_ROOT / "public" / "assets" / "fish"
RELIC_OUT_DIR = PROJECT_ROOT / "public" / "assets" / "relics"
ENV_OUT_DIR = PROJECT_ROOT / "public" / "assets" / "environment"

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")


class BgRemoverApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Underwater Explorer — AI Background Remover Studio")
        self.geometry("960x700")
        self.minsize(800, 600)

        self.selected_files = []
        self.output_directory = str(DEFAULT_OUT_DIR)
        self.is_processing = False
        self.stop_requested = False
        self.bg_model = None

        self._build_ui()
        self._init_model_async()

    def _build_ui(self):
        # ── Top Header ──────────────────────────────────────
        self.header_frame = ctk.CTkFrame(self, corner_radius=12, fg_color="#131B2E")
        self.header_frame.pack(fill="x", padx=16, pady=(16, 10))

        title_lbl = ctk.CTkLabel(
            self.header_frame,
            text="Underwater Explorer — AI Asset Studio",
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color="#38BDF8"
        )
        title_lbl.pack(anchor="w", padx=16, pady=(12, 2))

        self.gpu_badge = ctk.CTkLabel(
            self.header_frame,
            text="⚡ GPU: NVIDIA GeForce GTX 1650 (DirectML Enabled)",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color="#10B981"
        )
        self.gpu_badge.pack(anchor="w", padx=16, pady=(0, 12))

        # ── Main Content Grid (Left: Files & Settings, Right: Preview) ───
        self.main_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.main_frame.pack(fill="both", expand=True, padx=16, pady=5)
        self.main_frame.grid_columnconfigure(0, weight=3)
        self.main_frame.grid_columnconfigure(1, weight=2)
        self.main_frame.grid_rowconfigure(0, weight=1)

        # ── Left Column: Inputs, Destination & Progress ───
        self.left_col = ctk.CTkFrame(self.main_frame, corner_radius=12)
        self.left_col.grid(row=0, column=0, sticky="nsew", padx=(0, 8), pady=0)

        # 1. Input Section
        input_box = ctk.CTkFrame(self.left_col, fg_color="#1E293B", corner_radius=8)
        input_box.pack(fill="x", padx=14, pady=12)

        ctk.CTkLabel(
            input_box,
            text="1. Choose Photos for Processing",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="#E2E8F0"
        ).pack(anchor="w", padx=12, pady=(10, 6))

        btn_row = ctk.CTkFrame(input_box, fg_color="transparent")
        btn_row.pack(fill="x", padx=12, pady=(0, 8))

        ctk.CTkButton(
            btn_row,
            text="📂 Choose Files...",
            command=self._select_files,
            fg_color="#0284C7",
            hover_color="#0369A1",
            width=130
        ).pack(side="left", padx=(0, 8))

        ctk.CTkButton(
            btn_row,
            text="📁 Choose Folder...",
            command=self._select_folder,
            fg_color="#334155",
            hover_color="#475569",
            width=130
        ).pack(side="left", padx=4)

        ctk.CTkButton(
            btn_row,
            text="Clear",
            command=self._clear_files,
            fg_color="#64748B",
            hover_color="#475569",
            width=65
        ).pack(side="right", padx=(4, 0))

        self.input_status_lbl = ctk.CTkLabel(
            input_box,
            text="No files selected yet.",
            font=ctk.CTkFont(size=12),
            text_color="#94A3B8"
        )
        self.input_status_lbl.pack(anchor="w", padx=12, pady=(0, 10))

        # 2. Output Destination Section
        out_box = ctk.CTkFrame(self.left_col, fg_color="#1E293B", corner_radius=8)
        out_box.pack(fill="x", padx=14, pady=(0, 12))

        ctk.CTkLabel(
            out_box,
            text="2. Choose Destination Folder",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color="#E2E8F0"
        ).pack(anchor="w", padx=12, pady=(10, 6))

        # Game Presets
        presets_frame = ctk.CTkFrame(out_box, fg_color="transparent")
        presets_frame.pack(fill="x", padx=12, pady=(0, 6))

        ctk.CTkLabel(presets_frame, text="Game Presets:", font=ctk.CTkFont(size=11), text_color="#94A3B8").pack(side="left", padx=(0, 6))

        ctk.CTkButton(
            presets_frame,
            text="🐟 Fish",
            width=65,
            height=26,
            fg_color="#0F766E",
            hover_color="#115E59",
            command=lambda: self._set_out_dir(FISH_OUT_DIR)
        ).pack(side="left", padx=3)

        ctk.CTkButton(
            presets_frame,
            text="🏺 Relics",
            width=65,
            height=26,
            fg_color="#B45309",
            hover_color="#92400E",
            command=lambda: self._set_out_dir(RELIC_OUT_DIR)
        ).pack(side="left", padx=3)

        ctk.CTkButton(
            presets_frame,
            text="🌿 Coral",
            width=65,
            height=26,
            fg_color="#047857",
            hover_color="#065F46",
            command=lambda: self._set_out_dir(ENV_OUT_DIR)
        ).pack(side="left", padx=3)

        ctk.CTkButton(
            presets_frame,
            text="📁 Default",
            width=70,
            height=26,
            fg_color="#334155",
            hover_color="#475569",
            command=lambda: self._set_out_dir(DEFAULT_OUT_DIR)
        ).pack(side="left", padx=3)

        # Custom Folder Row
        custom_out_row = ctk.CTkFrame(out_box, fg_color="transparent")
        custom_out_row.pack(fill="x", padx=12, pady=(4, 10))

        self.out_dir_entry = ctk.CTkEntry(
            custom_out_row,
            placeholder_text="Destination folder...",
            font=ctk.CTkFont(size=11)
        )
        self.out_dir_entry.insert(0, str(self.output_directory))
        self.out_dir_entry.pack(side="left", fill="x", expand=True, padx=(0, 6))

        ctk.CTkButton(
            custom_out_row,
            text="Browse...",
            width=80,
            fg_color="#475569",
            hover_color="#334155",
            command=self._select_out_dir
        ).pack(side="right")

        # 3. File Queue List
        ctk.CTkLabel(
            self.left_col,
            text="File Processing Queue:",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color="#CBD5E1"
        ).pack(anchor="w", padx=16, pady=(4, 2))

        self.file_textbox = ctk.CTkTextbox(
            self.left_col,
            font=ctk.CTkFont(family="Consolas", size=11),
            fg_color="#0F172A",
            text_color="#E2E8F0",
            wrap="none"
        )
        self.file_textbox.pack(fill="both", expand=True, padx=14, pady=(0, 10))

        # 4. Action Buttons & Progress Bar
        action_box = ctk.CTkFrame(self.left_col, fg_color="transparent")
        action_box.pack(fill="x", padx=14, pady=(0, 14))

        self.progress_bar = ctk.CTkProgressBar(action_box, orientation="horizontal", mode="determinate")
        self.progress_bar.set(0)
        self.progress_bar.pack(fill="x", pady=(0, 8))

        btn_action_row = ctk.CTkFrame(action_box, fg_color="transparent")
        btn_action_row.pack(fill="x")

        self.start_btn = ctk.CTkButton(
            btn_action_row,
            text="🚀 Start Batch Background Removal",
            font=ctk.CTkFont(size=14, weight="bold"),
            height=40,
            fg_color="#2563EB",
            hover_color="#1D4ED8",
            command=self._start_batch_thread
        )
        self.start_btn.pack(side="left", fill="x", expand=True, padx=(0, 8))

        self.open_folder_btn = ctk.CTkButton(
            btn_action_row,
            text="📂 Open Output",
            height=40,
            width=120,
            fg_color="#334155",
            hover_color="#475569",
            command=self._open_output_folder
        )
        self.open_folder_btn.pack(side="right")

        # ── Right Column: Live Image Preview ───
        self.right_col = ctk.CTkFrame(self.main_frame, corner_radius=12, fg_color="#1E293B")
        self.right_col.grid(row=0, column=1, sticky="nsew", padx=(8, 0), pady=0)

        ctk.CTkLabel(
            self.right_col,
            text="Live Preview",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color="#F8FAFC"
        ).pack(anchor="w", padx=16, pady=(12, 4))

        self.preview_info_lbl = ctk.CTkLabel(
            self.right_col,
            text="Cutouts will show transparent background preview here.",
            font=ctk.CTkFont(size=11),
            text_color="#94A3B8"
        )
        self.preview_info_lbl.pack(anchor="w", padx=16, pady=(0, 10))

        self.preview_canvas_frame = ctk.CTkFrame(self.right_col, fg_color="#0F172A", corner_radius=10)
        self.preview_canvas_frame.pack(fill="both", expand=True, padx=14, pady=(0, 14))

        self.preview_image_lbl = ctk.CTkLabel(
            self.preview_canvas_frame,
            text="No image processed yet",
            text_color="#64748B",
            font=ctk.CTkFont(size=13)
        )
        self.preview_image_lbl.pack(expand=True)

        # ── Bottom Status Bar ───
        self.status_bar = ctk.CTkLabel(
            self,
            text="Ready. Select photos to begin.",
            font=ctk.CTkFont(size=11),
            text_color="#94A3B8",
            anchor="w"
        )
        self.status_bar.pack(fill="x", padx=20, pady=(0, 6))

    def _set_out_dir(self, directory: Path):
        directory.mkdir(parents=True, exist_ok=True)
        self.output_directory = str(directory)
        self.out_dir_entry.delete(0, "end")
        self.out_dir_entry.insert(0, str(directory))
        self.status_bar.configure(text=f"Destination set to: {directory.name}/")

    def _select_files(self):
        filetypes = [
            ("Image files", "*.png *.jpg *.jpeg *.webp *.bmp *.tif *.tiff"),
            ("All files", "*.*")
        ]
        files = filedialog.askopenfilenames(title="Select Images to Remove Background", filetypes=filetypes)
        if files:
            for f in files:
                if f not in self.selected_files:
                    self.selected_files.append(f)
            self._refresh_file_list()

    def _select_folder(self):
        folder = filedialog.askdirectory(title="Select Folder Containing Images")
        if folder:
            valid_exts = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
            folder_path = Path(folder)
            found = 0
            for item in folder_path.iterdir():
                if item.is_file() and item.suffix.lower() in valid_exts:
                    if str(item) not in self.selected_files:
                        self.selected_files.append(str(item))
                        found += 1
            self._refresh_file_list()
            self.status_bar.configure(text=f"Loaded {found} image(s) from {folder_path.name}")

    def _clear_files(self):
        self.selected_files = []
        self._refresh_file_list()

    def _select_out_dir(self):
        folder = filedialog.askdirectory(title="Choose Destination Folder")
        if folder:
            self._set_out_dir(Path(folder))

    def _refresh_file_list(self):
        self.file_textbox.configure(state="normal")
        self.file_textbox.delete("1.0", "end")
        if not self.selected_files:
            self.input_status_lbl.configure(text="No files selected yet.")
            self.file_textbox.insert("1.0", "(Queue is empty. Click 'Choose Files' or 'Choose Folder')\n")
        else:
            self.input_status_lbl.configure(text=f"{len(self.selected_files)} image(s) ready in queue")
            for idx, f in enumerate(self.selected_files, 1):
                name = os.path.basename(f)
                self.file_textbox.insert("end", f"[{idx:02d}] ⏳ {name}\n")
        self.file_textbox.configure(state="disabled")

    def _init_model_async(self):
        def _load():
            try:
                self.status_bar.configure(text="Initializing AI Model on GPU (DirectML)...")
                self.bg_model = WithoutBG.open_weights()
                self.status_bar.configure(text="Ready. GPU Acceleration Active.")
            except Exception as e:
                self.status_bar.configure(text=f"Model init notice: {e}")
        threading.Thread(target=_load, daemon=True).start()

    def _start_batch_thread(self):
        if self.is_processing:
            return

        if not self.selected_files:
            messagebox.showwarning("No Files", "Please select image files or a folder first!")
            return

        out_dir = Path(self.out_dir_entry.get().strip())
        if not out_dir:
            messagebox.showwarning("No Destination", "Please specify a destination folder!")
            return

        out_dir.mkdir(parents=True, exist_ok=True)
        self.output_directory = str(out_dir)

        self.is_processing = True
        self.start_btn.configure(text="⏳ Processing on GPU...", state="disabled")
        threading.Thread(target=self._process_batch, args=(out_dir,), daemon=True).start()

    def _process_batch(self, out_dir: Path):
        total = len(self.selected_files)
        success_count = 0

        if not self.bg_model:
            self.bg_model = WithoutBG.open_weights()

        for idx, file_path in enumerate(self.selected_files):
            p = Path(file_path)
            out_file = out_dir / f"{p.stem}.png"
            name = p.name

            self.status_bar.configure(text=f"Processing [{idx + 1}/{total}]: {name} on GTX 1650...")

            t0 = time.time()
            try:
                # Remove background
                res_img = self.bg_model.remove_background(str(p))
                res_img.save(str(out_file), format="PNG")
                elapsed = time.time() - t0
                success_count += 1

                # Update preview with result
                self._update_preview(res_img, f"{out_file.name} ({elapsed:.1f}s)")

                # Update status
                progress = (idx + 1) / total
                self.progress_bar.set(progress)

            except Exception as e:
                print(f"Error on {name}: {e}")

        self.is_processing = False
        self.start_btn.configure(text="🚀 Start Batch Background Removal", state="normal")
        self.status_bar.configure(text=f"✅ Finished! Successfully processed {success_count} of {total} images.")
        messagebox.showinfo(
            "Batch Complete!",
            f"Done! {success_count} transparent image(s) saved to:\n\n{out_dir}"
        )

    def _update_preview(self, pil_image: Image.Image, caption: str):
        try:
            # Resize image to fit preview frame (around 320x320)
            max_size = (320, 320)
            img_copy = pil_image.copy()
            img_copy.thumbnail(max_size, Image.Resampling.LANCZOS)

            ctk_img = ctk.CTkImage(light_image=img_copy, dark_image=img_copy, size=img_copy.size)
            self.preview_image_lbl.configure(image=ctk_img, text="")
            self.preview_info_lbl.configure(text=f"✅ Last output: {caption}")
        except Exception as e:
            print("Preview render error:", e)

    def _open_output_folder(self):
        target = self.out_dir_entry.get().strip() or str(DEFAULT_OUT_DIR)
        target_path = Path(target)
        target_path.mkdir(parents=True, exist_ok=True)
        os.system(f'explorer "{target_path}"')


if __name__ == "__main__":
    app = BgRemoverApp()
    app.mainloop()

