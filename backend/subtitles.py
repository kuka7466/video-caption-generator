"""ASS subtitle generation with word-by-word animations and advanced layout controls.

Creates styled ASS (Advanced SubStation Alpha) subtitle files with per-word
highlight animations. Supports 11 creator styles across multiple aspect ratios
(16:9 Desktop/Landscape, 9:16 Mobile/Vertical, 1:1 Square, 4:5 Portrait) with
custom words-per-segment, line limits, font overrides, and text transformation.
"""

import re
import pysubs2

from caption_styles import get_caption_style, get_output_format, hex_to_rgb, rgb_to_ass
from subtitle_utils import (
    escape_ass_text,
    get_subtitle_layout,
    is_latin_language,
    is_rtl_language,
    strip_emojis,
)


def _apply_text_transform(text: str, transform: str) -> str:
    """Apply text casing transformation."""
    if not transform or transform == "uppercase":
        return text.upper()
    if transform == "titlecase":
        return text.title()
    if transform == "lowercase":
        return text.lower()
    return text  # "original"


def generate_ass(
    transcript: dict,
    clip_start: float,
    clip_end: float,
    output_path: str,
    *,
    caption_style: str = "hormozi",
    caption_position: int = 10,
    language: str = "en",
    video_width: int | None = None,
    video_height: int | None = None,
    words_per_segment: int | None = 2,
    max_lines: int = 1,
    font_family: str | None = None,
    font_size_scale: float = 1.0,
    text_transform: str = "uppercase",
    primary_color_override: str | None = None,
    highlight_color_override: str | None = None,
    outline_enabled: bool = False,
    outline_color: str | None = None,
    outline_size: float | None = None,
    animation_type: str | None = None,
) -> bool:
    """Generate an ASS subtitle file with styled word-by-word animations.

    Args:
        transcript: Dict with ``segments`` containing word-level timestamps.
        clip_start: Start time of clip in seconds.
        clip_end: End time of clip in seconds.
        output_path: Path to write the ``.ass`` file.
        caption_style: Style ID (hormozi, mrbeast, karaoke, minimal, bounce, classic, cyberpunk, aliabdaal, cinematic, spotlight, retrowave).
        caption_position: Position as percentage from bottom (5-50).
        language: Language code for font selection.
        video_width: Actual video width.
        video_height: Actual video height.
        words_per_segment: Max words to show on screen simultaneously (1 to 10).
        max_lines: Maximum number of lines per subtitle block (1 or 2).
        font_family: Optional font name override.
        font_size_scale: Scale factor for font size (0.5 to 2.0).
        text_transform: 'uppercase', 'titlecase', 'lowercase', or 'original'.
        primary_color_override: Hex color string (e.g. '#FFFFFF') or ASS color.
        highlight_color_override: Hex color string (e.g. '#00FFFF') or ASS color.

    Returns:
        ``True`` if successful, ``False`` if no words found in the clip range.
    """
    style_config = get_caption_style(caption_style)

    # Calculate dimensions and aspect ratio scaling
    if video_width and video_height:
        play_res_x = video_width
        play_res_y = video_height
        is_landscape = video_width > video_height
        is_square = abs(video_width - video_height) < 50

        if is_landscape:
            # 16:9 Landscape / Desktop scaling (1080p reference)
            dimension_scale = max(video_height / 1080, 0.45)
            base_chars_per_line = 36
        elif is_square:
            # 1:1 Square scaling
            dimension_scale = max(video_height / 1080, 0.40)
            base_chars_per_line = 24
        else:
            # 9:16 Vertical scaling (1920p reference)
            dimension_scale = max(video_height / 1920, 0.35)
            base_chars_per_line = 18
    else:
        format_config = get_output_format("vertical")
        play_res_x = format_config.width
        play_res_y = format_config.height
        dimension_scale = 1.0
        base_chars_per_line = 18

    # Prefer auto-detected language from transcript over caller's default
    language = transcript.get("language", language)

    # Extract words within the clip range
    clip_segments: list[dict] = []
    for segment in transcript.get("segments", []):
        for word_info in segment.get("words", []):
            if (
                word_info.get("end") is not None
                and word_info.get("start") is not None
                and word_info["end"] > clip_start
                and word_info["start"] < clip_end
            ):
                word_text = strip_emojis(word_info["word"].strip())
                if not word_text:
                    continue
                clip_segments.append(
                    {
                        "word": word_text,
                        "start": word_info["start"],
                        "end": word_info["end"],
                    }
                )

    if not clip_segments:
        return False

    # Layout limits
    _, font_scale = get_subtitle_layout(language, style_config.font_size)
    
    # Adjust max chars based on language and landscape
    if not is_latin_language(language):
        max_chars_per_line = int(base_chars_per_line * 0.65)
    else:
        max_chars_per_line = base_chars_per_line

    effective_max_lines = max(1, min(2, int(max_lines)))
    target_words_per_segment = int(words_per_segment) if words_per_segment and int(words_per_segment) > 0 else None

    # Group words into subtitle events
    subtitles: list[tuple[float, float, list[tuple]]] = []
    current_lines: list[list[tuple]] = [[]]
    current_line_chars: list[int] = [0]
    current_word_count: int = 0
    current_start: float | None = None
    current_end: float | None = None

    for seg in clip_segments:
        word = seg["word"]
        seg_start = seg["start"]
        seg_end = seg["end"]

        if not word:
            continue

        start_rel = max(0.0, seg_start - clip_start)
        end_rel = max(0.0, seg_end - clip_start)

        if end_rel <= 0:
            continue

        word_length = len(word)

        # Start a new group if empty
        if not any(current_lines):
            current_start = start_rel
            current_end = end_rel
            current_lines = [[(word, start_rel, end_rel)]]
            current_line_chars = [word_length]
            current_word_count = 1
        else:
            current_line_idx = len(current_lines) - 1
            current_line = current_lines[current_line_idx]
            current_chars = current_line_chars[current_line_idx]
            chars_with_word = current_chars + (1 if current_line else 0) + word_length

            # Check if group limit is reached by word count or character limit
            is_word_limit_reached = target_words_per_segment is not None and current_word_count >= target_words_per_segment

            if not is_word_limit_reached and chars_with_word <= max_chars_per_line:
                # Word fits on current line
                current_line.append((word, start_rel, end_rel))
                current_line_chars[current_line_idx] = chars_with_word
                current_end = end_rel
                current_word_count += 1
            elif not is_word_limit_reached and current_line_idx + 1 < effective_max_lines:
                # Start new line within current group
                current_lines.append([(word, start_rel, end_rel)])
                current_line_chars.append(word_length)
                current_end = end_rel
                current_word_count += 1
            else:
                # Group is full — flush and begin new subtitle group
                flattened_words = []
                for line_idx, line in enumerate(current_lines):
                    for word_tuple in line:
                        flattened_words.append(word_tuple + (line_idx,))
                subtitles.append((current_start, current_end, flattened_words))

                current_start = start_rel
                current_end = end_rel
                current_lines = [[(word, start_rel, end_rel)]]
                current_line_chars = [word_length]
                current_word_count = 1

    # Flush final group
    if any(current_lines):
        flattened_words = []
        for line_idx, line in enumerate(current_lines):
            for word_tuple in line:
                flattened_words.append(word_tuple + (line_idx,))
        subtitles.append((current_start, current_end, flattened_words))

    # Helper: parse ASS colour string to pysubs2.Color
    def _parse_ass_or_hex_color(col: str, fallback_ass: str) -> pysubs2.Color:
        try:
            if col.startswith("#"):
                r, g, b = hex_to_rgb(col)
                return pysubs2.Color(r, g, b, 0)
            if col.startswith("&H"):
                color_hex = col.replace("&H", "").replace("&", "").zfill(8)
                alpha = int(color_hex[0:2], 16)
                blue = int(color_hex[2:4], 16)
                green = int(color_hex[4:6], 16)
                red = int(color_hex[6:8], 16)
                return pysubs2.Color(red, green, blue, alpha)
        except Exception:
            pass
        color_hex = fallback_ass.replace("&H", "").replace("&", "").zfill(8)
        return pysubs2.Color(int(color_hex[6:8], 16), int(color_hex[4:6], 16), int(color_hex[2:4], 16), int(color_hex[0:2], 16))

    # Build SSAFile
    subs = pysubs2.SSAFile()
    subs.info["WrapStyle"] = 3
    subs.info["ScaledBorderAndShadow"] = "yes"
    subs.info["PlayResX"] = play_res_x
    subs.info["PlayResY"] = play_res_y
    subs.info["ScriptType"] = "v4.00+"

    style_name = "Default"
    new_style = pysubs2.SSAStyle()

    # Font selection
    if font_family and font_family.strip():
        new_style.fontname = font_family.strip()
    elif is_latin_language(language):
        new_style.fontname = style_config.font_name
    else:
        new_style.fontname = style_config.font_name_fallback

    # Scaling and colors
    effective_scale = font_scale * dimension_scale * max(0.5, min(2.0, float(font_size_scale)))
    new_style.fontsize = int(style_config.font_size * effective_scale)

    new_style.primarycolor = _parse_ass_or_hex_color(primary_color_override or style_config.primary_color, style_config.primary_color)
    new_style.bold = style_config.bold
    new_style.italic = style_config.italic
    # Outline controls
    if outline_enabled is False or (outline_size is not None and float(outline_size) == 0):
        new_style.outline = 0.0
    else:
        base_outline = float(outline_size) if outline_size is not None else style_config.outline_size
        new_style.outline = round(base_outline * effective_scale, 1)
        if outline_color:
            new_style.outlinecolor = _parse_ass_or_hex_color(outline_color, style_config.outline_color)
        else:
            new_style.outlinecolor = _parse_ass_or_hex_color(style_config.outline_color, style_config.outline_color)
    new_style.shadow = round(style_config.shadow_depth * effective_scale, 1)
    new_style.shadowcolor = _parse_ass_or_hex_color(style_config.shadow_color, style_config.shadow_color)
    new_style.alignment = pysubs2.Alignment.BOTTOM_CENTER
    new_style.marginl = int(40 * dimension_scale)
    new_style.marginr = int(40 * dimension_scale)
    new_style.marginv = int(play_res_y * caption_position / 100)
    new_style.spacing = 0.5

    subs.styles[style_name] = new_style

    # Highlight color for active animation
    if highlight_color_override:
        if highlight_color_override.startswith("#"):
            r, g, b = hex_to_rgb(highlight_color_override)
            highlight_color = rgb_to_ass(r, g, b)
        else:
            highlight_color = highlight_color_override
    else:
        highlight_color = style_config.highlight_color

    effective_anim = animation_type if animation_type and animation_type != "default" else style_config.animation_type

    # Generate subtitle events with word animations
    for _, line_end, word_list in subtitles:
        for idx, (word, word_start, _, _) in enumerate(word_list):
            if idx < len(word_list) - 1:
                event_end = word_list[idx + 1][1]
            else:
                event_end = line_end

            text_parts: list[str] = []
            prev_line_idx = None

            for i, (w, w_start, w_end, line_idx) in enumerate(word_list):
                if prev_line_idx is not None and line_idx != prev_line_idx:
                    text_parts.append("\\N")

                w_display = _apply_text_transform(w, text_transform)
                w_escaped = escape_ass_text(w_display)

                if i == idx:
                    # Current active word
                    word_color = highlight_color

                    if effective_anim == "karaoke":
                        if is_rtl_language(language):
                            text_parts.append(f"{{\\c{word_color}}}{w_escaped}{{\\r}}")
                        else:
                            duration_cs = int((w_end - w_start) * 100) if w_end > w_start else 30
                            text_parts.append(f"{{\\kf{duration_cs}\\c{word_color}}}{w_escaped}{{\\r}}")
                    elif effective_anim == "stretch":
                        text_parts.append(
                            f"{{\\t(0,60,\\fscx126\\fscy82)"
                            f"\\t(60,130,\\fscx100\\fscy100)"
                            f"\\c{word_color}}}{w_escaped}{{\\r}}"
                        )
                    elif effective_anim == "glitch":
                        text_parts.append(
                            f"{{\\c&H00F0FF&\\3c&HFF007F&"
                            f"\\t(0,40,\\c&HFF007F&\\3c&H00F0FF&)"
                            f"\\t(40,100,\\c{word_color})}}{w_escaped}{{\\r}}"
                        )
                    elif effective_anim == "slide":
                        text_parts.append(
                            f"{{\\t(0,50,\\frz-4\\fscy110)"
                            f"\\t(50,110,\\frz0\\fscy100)"
                            f"\\c{word_color}}}{w_escaped}{{\\r}}"
                        )
                    elif effective_anim == "blur":
                        text_parts.append(
                            f"{{\\blur5\\t(0,60,\\blur0)"
                            f"\\c{word_color}}}{w_escaped}{{\\r}}"
                        )
                    elif effective_anim == "scale":
                        text_parts.append(f"{{\\fscx114\\fscy114\\c{word_color}}}{w_escaped}{{\\r}}")
                    elif effective_anim == "bounce":
                        bounce_pct = 120 if font_scale >= 1.0 else 112
                        text_parts.append(
                            f"{{\\t(0,50,\\fscx{bounce_pct}\\fscy{bounce_pct})"
                            f"\\t(50,100,\\fscx100\\fscy100)"
                            f"\\c{word_color}}}{w_escaped}{{\\r}}"
                        )
                    else:
                        text_parts.append(f"{{\\c{word_color}}}{w_escaped}{{\\r}}")
                else:
                    text_parts.append(w_escaped)

                prev_line_idx = line_idx

            if style_config.word_spacing != 100:
                space = f"{{\\fscx{style_config.word_spacing}}} {{\\fscx100}}"
                text = space.join(text_parts)
            else:
                text = " ".join(text_parts)

            if style_config.letter_spacing != 0:
                text = f"{{\\fsp{style_config.letter_spacing}}}{text}"

            event = pysubs2.SSAEvent(
                start=pysubs2.make_time(s=word_start),
                end=pysubs2.make_time(s=event_end),
                text=text,
                style=style_name,
            )
            subs.events.append(event)

    subs.save(output_path)
    return True
