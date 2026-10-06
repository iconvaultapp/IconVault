import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Frequency Calculator - Free Online Tool | IconVault",
    metaDescription: "Convert Hz, kHz, MHz, GHz with period and wavelength, plus musical note frequencies, MIDI numbers and note lengths at any BPM. Free.",
    about: [
      "**IconVault**'s **Frequency Calculator** converts between **Hz, kHz, MHz and GHz**, and derives the **period**, the **wavelength in air**, and the **radio wavelength** from any value. The musical tab maps any **MIDI note to its frequency**, finds the **nearest note to a measured frequency** (with cents offset), and lists **note lengths in milliseconds at any BPM**.",
      "Useful for **audio work**, **radio planning**, and **music production**: delay times, tuning checks, and quick unit math in one place. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the frequency calculator free?", a: "Yes. Convert frequencies and calculate note values free within your plan limits. Everything is computed locally." },
      { q: "How do I convert MHz to Hz?", a: "Multiply by 1,000,000. The tool does all four units (Hz, kHz, MHz, GHz) at once, so you never have to count zeros." },
      { q: "What is the wavelength of a sound?", a: "Wavelength = speed of sound (343 m/s) divided by frequency. A 440 Hz A4 has a wavelength of about 0.78 meters. For radio waves the tool uses the speed of light instead." },
      { q: "How is note frequency calculated?", a: "With equal temperament: frequency = 440 x 2^((MIDI - 69) / 12), with A4 = 440 Hz. The slider covers MIDI 12 to 127 (C0 to G9)." },
      { q: "What does cents offset mean?", a: "Cents measure tuning deviation: 100 cents = one semitone. If your measured 445 Hz shows +22 cents from A4, your instrument is sharp by about a fifth of a semitone." },
      { q: "How do I set delay time from BPM?", a: "Look up your BPM in the note-length table: a dotted eighth (0.75 beats) is the classic slapback delay. At 120 BPM that is 375 ms." },
    ],
    tags: ["frequency calculator", "hz to khz", "mhz to hz", "ghz to mhz", "frequency unit converter", "hz khz mhz ghz chart", "wavelength calculator", "sound wavelength calculator", "frequency to wavelength", "period of frequency calculator", "radio wavelength calculator", "musical note frequency", "note to frequency calculator", "midi to frequency", "frequency to midi note", "a440 frequency", "note frequency chart", "cents tuning calculator", "find note from frequency", "bpm to milliseconds", "note length calculator", "delay time calculator bpm", "dotted eighth delay ms", "music tempo calculator", "bpm ms chart", "audio frequency converter", "fm radio frequency range", "wifi frequency ghz", "human hearing range hz", "equal temperament calculator", "piano note frequencies", "guitar tuning frequency", "440 hz to note", "frequency period formula", "hz to seconds", "khz to mhz converter", "frequency conversion table", "sound engineering calculator", "music production calculator", "tuning calculator cents", "semitone frequency ratio", "midi note numbers chart", "note duration ms", "whole note milliseconds", "eighth note ms calculator", "tempo delay chart", "free frequency converter", "online frequency calculator", "audio math tool", "frequency wavelength period"],
  };

export default seo;
