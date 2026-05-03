import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Switch } from "@base-ui/react/switch";
import { Tabs } from "@base-ui/react/tabs";
import { Toggle } from "@base-ui/react/toggle";
import { Icon } from "@iconify/react";
import { Moon, Sun } from "lucide-react";
import { pets, type Pet } from "./pets";

const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;
const ATLAS_COLUMNS = 8;
const ATLAS_ROWS = 9;
const SITE_BASE_URL = "https://lencx.me/pet";
const LOGO_URL = `${import.meta.env.BASE_URL}logo.svg`;

type Theme = "light" | "dark";

type AnimationState = {
  id: string;
  label: string;
  row: number;
  durations: number[];
};

type SpriteFrameProps = {
  pet: Pet;
  state: AnimationState;
  frame: number;
  scale: number;
  className?: string;
};

type InstallCard = {
  title: string;
  description: string;
  command: string;
};

const states: AnimationState[] = [
  { id: "idle", label: "Idle", row: 0, durations: [280, 110, 110, 140, 140, 320] },
  {
    id: "running-right",
    label: "Run Right",
    row: 1,
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
  },
  {
    id: "running-left",
    label: "Run Left",
    row: 2,
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
  },
  { id: "waving", label: "Waving", row: 3, durations: [140, 140, 140, 280] },
  { id: "jumping", label: "Jumping", row: 4, durations: [140, 140, 140, 140, 280] },
  {
    id: "failed",
    label: "Failed",
    row: 5,
    durations: [140, 140, 140, 140, 140, 140, 140, 240],
  },
  { id: "waiting", label: "Waiting", row: 6, durations: [150, 150, 150, 150, 150, 260] },
  { id: "running", label: "Running", row: 7, durations: [120, 120, 120, 120, 120, 220] },
  { id: "review", label: "Review", row: 8, durations: [150, 150, 150, 150, 150, 280] },
];

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function checkerStyle(theme: Theme): CSSProperties {
  const color = theme === "dark" ? "rgba(255,255,255,0.055)" : "#ebe6df";
  return {
    backgroundImage: `
      linear-gradient(45deg, ${color} 25%, transparent 25%),
      linear-gradient(-45deg, ${color} 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, ${color} 75%),
      linear-gradient(-45deg, transparent 75%, ${color} 75%)
    `,
    backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
    backgroundSize: "24px 24px",
  };
}

function SpriteFrame({ pet, state, frame, scale, className = "" }: SpriteFrameProps) {
  return (
    <div
      className={cx("shrink-0 bg-no-repeat [image-rendering:pixelated]", className)}
      style={{
        width: CELL_WIDTH * scale,
        height: CELL_HEIGHT * scale,
        backgroundImage: `url(${pet.spritesheetUrl})`,
        backgroundPosition: `${-frame * CELL_WIDTH * scale}px ${-state.row * CELL_HEIGHT * scale}px`,
        backgroundSize: `${CELL_WIDTH * ATLAS_COLUMNS * scale}px ${CELL_HEIGHT * ATLAS_ROWS * scale}px`,
      }}
    />
  );
}

function App() {
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id ?? "");
  const [selectedStateId, setSelectedStateId] = useState("idle");
  const [frame, setFrame] = useState(0);
  const [scale, setScale] = useState(1.85);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [activeSection, setActiveSection] = useState("preview");
  const [copiedCommand, setCopiedCommand] = useState("");
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = window.localStorage.getItem("pet-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const isDark = theme === "dark";
  const selectedPet = useMemo(
    () => pets.find((pet) => pet.id === selectedPetId) ?? pets[0],
    [selectedPetId],
  );

  const selectedState = useMemo(
    () => states.find((state) => state.id === selectedStateId) ?? states[0],
    [selectedStateId],
  );
  const installCommand = `curl -fsSL ${SITE_BASE_URL}/install.sh | sh -s -- ${selectedPet?.id ?? "kerno"}`;
  const listCommand = `curl -fsSL ${SITE_BASE_URL}/install.sh | sh -s -- --list`;
  const installAllCommand = `curl -fsSL ${SITE_BASE_URL}/install.sh | sh -s -- --all`;
  const windowsCommand = `irm ${SITE_BASE_URL}/install.ps1 | iex; CodexPet ${selectedPet?.id ?? "kerno"}`;
  const installCards: InstallCard[] = [
    { title: "macOS / Linux", description: `Install ${selectedPet?.displayName ?? "Codex pet"}`, command: installCommand },
    { title: "Windows PowerShell", description: `Install ${selectedPet?.displayName ?? "Codex pet"}`, command: windowsCommand },
    { title: "List Pets", description: "Show every pet in the generated index", command: listCommand },
    { title: "All Pets", description: "Install every pet in the generated index", command: installAllCommand },
  ];

  useEffect(() => {
    setFrame(0);
  }, [selectedPetId, selectedStateId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("pet-theme", theme);
  }, [isDark, theme]);

  useEffect(() => {
    if (paused) {
      return undefined;
    }

    const duration = selectedState.durations[frame] ?? selectedState.durations[0];
    const timer = window.setTimeout(() => {
      setFrame((currentFrame) => (currentFrame + 1) % selectedState.durations.length);
    }, duration / speed);

    return () => window.clearTimeout(timer);
  }, [frame, paused, selectedState, speed]);

  function handleSectionChange(section: string) {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyCommand(command: string) {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    window.setTimeout(() => {
      setCopiedCommand((currentCommand) => (currentCommand === command ? "" : currentCommand));
    }, 1400);
  }

  if (!selectedPet) {
    return (
      <main className="grid min-h-screen place-content-center gap-2 bg-stone-100 text-center text-stone-950 dark:bg-stone-950 dark:text-stone-100">
        <h1 className="m-0 text-xl font-semibold">AI Pet Preview</h1>
        <p className="m-0 text-sm text-stone-500 dark:text-stone-400">No Codex pets were found.</p>
      </main>
    );
  }

  const shellTone = isDark
    ? "bg-stone-950 text-stone-100 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)]"
    : "bg-stone-100 text-stone-950 [background-image:linear-gradient(#eee7dc_1px,transparent_1px),linear-gradient(90deg,#eee7dc_1px,transparent_1px)]";
  const glassHeader = isDark
    ? "border-white/10 bg-stone-950/70"
    : "border-stone-200/80 bg-white/70";
  const card = isDark
    ? "border-stone-700/80 bg-stone-900/90 shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
    : "border-stone-300 bg-[#fffdfa]/95 shadow-[0_18px_50px_rgba(44,40,32,0.12)]";
  const mutedText = isDark ? "text-stone-400" : "text-stone-500";
  const buttonBase = isDark
    ? "border-stone-700 bg-stone-800 hover:border-stone-500"
    : "border-stone-300 bg-[#fffdfa] hover:border-stone-400";
  const activeButton = isDark
    ? "border-emerald-300 bg-emerald-950/70 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.25)]"
    : "border-emerald-700 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(4,120,87,0.25)]";
  const stageTone = isDark ? "bg-stone-900" : "bg-[#fffdfa]";
  const navTab = cx(
    "relative z-10 min-w-[64px] rounded-md border-0 bg-transparent px-2 py-1.5 text-center text-[12px] font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500/70 sm:min-w-[72px] sm:px-3 sm:text-[13px]",
    isDark
      ? "text-stone-300 hover:text-white aria-selected:text-white data-[selected]:text-white"
      : "text-stone-700 hover:text-stone-950 aria-selected:text-stone-950 data-[selected]:text-stone-950",
  );
  const navIndicator = isDark
    ? "bg-stone-700 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
    : "bg-white shadow-[0_1px_5px_rgba(44,40,32,0.1)]";

  return (
    <main className={cx("min-h-screen bg-[length:36px_36px] px-2.5 pb-2.5 pt-[82px] text-[14px] sm:px-[18px] sm:pb-[18px] sm:pt-[104px]", shellTone)}>
      <header className={cx("fixed inset-x-0 top-0 z-10 border-b backdrop-blur-[18px] backdrop-saturate-150", glassHeader)}>
        <div className="mx-auto grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-2 py-1.5 sm:min-h-16 sm:gap-3 sm:px-[18px] sm:py-2">
          <a className="inline-flex w-max items-center gap-3" href="#preview" aria-label="AI Pet home">
            <span className="grid size-10 place-items-center overflow-hidden rounded-lg sm:size-[42px]">
              <img alt="" className="size-10 sm:size-[42px]" src={LOGO_URL} />
            </span>
          </a>

          <div className="inline-flex min-w-0 items-center justify-end gap-2">
            <Tabs.Root value={activeSection} onValueChange={handleSectionChange}>
              <Tabs.List
                className={cx(
                  "relative inline-flex min-w-0 rounded-lg border p-1",
                  isDark ? "border-stone-700 bg-stone-950/55" : "border-stone-300 bg-stone-100/80",
                )}
                aria-label="Primary navigation"
              >
                <Tabs.Tab className={navTab} value="preview">
                  Preview
                </Tabs.Tab>
                <Tabs.Tab className={navTab} value="install">
                  Install
                </Tabs.Tab>
                <Tabs.Indicator
                  className={cx(
                    "absolute left-[var(--active-tab-left)] top-[var(--active-tab-top)] z-0 h-[var(--active-tab-height)] w-[var(--active-tab-width)] rounded-md transition-all duration-150",
                    navIndicator,
                  )}
                />
              </Tabs.List>
            </Tabs.Root>

            <Toggle
              aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
              className={cx(
                "inline-flex min-h-[42px] w-[42px] items-center justify-center rounded-lg border p-2 text-[13px] font-extrabold outline-none transition sm:w-auto sm:px-3",
                isDark ? "border-emerald-300 bg-emerald-950/70 text-emerald-100" : "border-stone-300 bg-[#fffdfa] text-stone-950 hover:border-emerald-700 hover:text-emerald-700",
              )}
              onPressedChange={(pressed) => setTheme(pressed ? "dark" : "light")}
              pressed={isDark}
            >
              {isDark ? <Sun aria-hidden="true" size={18} strokeWidth={2.1} /> : <Moon aria-hidden="true" size={18} strokeWidth={2.1} />}
              <span className="hidden sm:ml-2 sm:inline">{isDark ? "Light" : "Dark"}</span>
            </Toggle>

            <a
              className={cx(
                "inline-flex min-h-[42px] w-[42px] items-center justify-center rounded-lg border p-2 text-[13px] font-extrabold transition sm:w-auto sm:px-3",
                isDark ? "border-stone-100 bg-stone-100 text-stone-950 hover:bg-emerald-300" : "border-stone-950 bg-stone-950 text-white hover:bg-emerald-900",
              )}
              href="https://github.com/lencx/pet"
              rel="noreferrer"
              target="_blank"
            >
              <Icon aria-hidden="true" className="size-5" icon="mdi:github" />
              <span className="hidden sm:ml-2 sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] scroll-mt-[82px] sm:scroll-mt-[104px]" id="preview" aria-label="Animation preview">
        <div className="mb-3 flex items-end justify-between gap-6">
          <span className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300">Live Preview</span>
        </div>

        <section className={cx("overflow-hidden rounded-lg border", card)} aria-label="Selected pet preview">
          <div className={cx("border-b p-2.5", isDark ? "border-stone-700 bg-stone-900/80" : "border-stone-300 bg-white/45")}>
            <div className="flex min-w-0 gap-2 overflow-x-auto" aria-label="Pets">
              {pets.map((pet) => {
                const isActive = pet.id === selectedPet.id;
                return (
                  <button
                    className={cx(
                      "flex min-h-[50px] min-w-[154px] flex-col justify-center gap-1 rounded-lg border px-3 py-2 text-left transition",
                      isActive ? activeButton : buttonBase,
                    )}
                    key={pet.id}
                    onClick={() => setSelectedPetId(pet.id)}
                    type="button"
                  >
                    <span className="text-[12px] font-extrabold">{pet.displayName}</span>
                    <small className={cx("text-[11px]", mutedText)}>ID: {pet.id}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid min-h-[340px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div
              className={cx("relative grid min-h-[320px] place-items-center overflow-auto p-4 pb-[84px] sm:min-h-[340px] sm:pb-[92px]", stageTone)}
              style={checkerStyle(theme)}
            >
              <SpriteFrame
                className="drop-shadow-[0_24px_24px_rgba(34,37,35,0.17)]"
                frame={frame}
                pet={selectedPet}
                scale={scale}
                state={selectedState}
              />

              <div
                className={cx(
                  "absolute bottom-3 left-3 right-3 flex max-w-[calc(100%-24px)] gap-1.5 overflow-x-auto rounded-lg border p-1.5 backdrop-blur",
                  isDark ? "border-stone-700 bg-stone-950/70" : "border-stone-300 bg-[#fbf8f2]/80",
                )}
                aria-label="Frames"
              >
                {selectedState.durations.map((duration, index) => (
                  <button
                    className={cx(
                      "grid h-[70px] w-16 shrink-0 place-items-center rounded-lg border transition",
                      index === frame ? activeButton : buttonBase,
                    )}
                    key={`${selectedState.id}-${index}`}
                    onClick={() => setFrame(index)}
                    title={`${selectedState.label} frame ${index + 1}, ${duration}ms`}
                    type="button"
                  >
                    <SpriteFrame frame={index} pet={selectedPet} scale={0.32} state={selectedState} />
                  </button>
                ))}
              </div>
            </div>

            <aside
              className={cx(
                "grid content-start gap-4 border-t p-4 lg:border-l lg:border-t-0",
                isDark ? "border-stone-700 bg-stone-900/90" : "border-stone-300 bg-[#fffdfa]/90",
              )}
              aria-label="Preview controls"
            >
              <div className="grid gap-1 border-b border-stone-300 pb-3 text-center dark:border-stone-700">
                <span className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300">State</span>
                <h2 className="m-0 text-[18px] font-bold leading-tight">{selectedState.label}</h2>
                <p className={cx("m-0 text-[12px]", mutedText)}>{selectedState.durations.length} frames in this loop</p>
              </div>

              <div className="grid gap-2">
                <h2 className={cx("m-0 text-[11px] font-bold uppercase", mutedText)}>States</h2>
                <div className="grid grid-cols-3 gap-1.5" aria-label="Animation states">
                  {states.map((state) => {
                    const isActive = state.id === selectedState.id;
                    return (
                      <button
                        className={cx(
                          "flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-center transition",
                          isActive ? activeButton : buttonBase,
                        )}
                        key={state.id}
                        onClick={() => setSelectedStateId(state.id)}
                        type="button"
                      >
                        <span className="text-[12px] font-extrabold leading-tight">{state.label}</span>
                        <small className={cx("text-[11px]", mutedText)}>{state.durations.length}f</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <h2 className={cx("m-0 text-[11px] font-bold uppercase", mutedText)}>Controls</h2>
                <label className={cx("inline-flex min-h-[42px] items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px] font-extrabold", isDark ? "bg-white/5" : "bg-black/5")}>
                  <Switch.Root
                    checked={paused}
                    className={cx(
                      "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border p-0.5 outline-none transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 data-[checked]:border-emerald-500 data-[checked]:bg-gradient-to-br data-[checked]:from-emerald-400 data-[checked]:to-emerald-700",
                      isDark ? "border-stone-500 bg-stone-700" : "border-stone-400 bg-stone-200",
                    )}
                    onCheckedChange={(checked) => setPaused(checked)}
                  >
                    <Switch.Thumb
                      className={cx(
                        "block size-4 rounded-full shadow-sm transition data-[checked]:translate-x-4",
                        isDark ? "bg-stone-200 data-[checked]:bg-stone-950" : "bg-white data-[checked]:bg-white",
                      )}
                    />
                  </Switch.Root>
                  <span>Pause</span>
                </label>

                <label className="grid min-h-10 grid-cols-[56px_minmax(0,1fr)_52px] items-center gap-2.5 text-[12px]">
                  <span className={mutedText}>Scale</span>
                  <input
                    className="accent-emerald-700 dark:accent-emerald-300"
                    max="2.6"
                    min="1"
                    onChange={(event) => setScale(Number(event.target.value))}
                    step="0.1"
                    type="range"
                    value={scale}
                  />
                  <strong className="text-right">{scale.toFixed(1)}x</strong>
                </label>
                <label className="grid min-h-10 grid-cols-[56px_minmax(0,1fr)_52px] items-center gap-2.5 text-[12px]">
                  <span className={mutedText}>Speed</span>
                  <input
                    className="accent-emerald-700 dark:accent-emerald-300"
                    max="2"
                    min="0.5"
                    onChange={(event) => setSpeed(Number(event.target.value))}
                    step="0.1"
                    type="range"
                    value={speed}
                  />
                  <strong className="text-right">{speed.toFixed(1)}x</strong>
                </label>
              </div>

              <div className="grid gap-2">
                <h2 className={cx("m-0 text-[11px] font-bold uppercase", mutedText)}>Atlas</h2>
                <dl className="m-0 grid gap-2.5 text-[12px]">
                  <div className="flex justify-between gap-4 border-b border-stone-300 pb-2.5 dark:border-stone-700">
                    <dt className={mutedText}>Cell</dt>
                    <dd className="m-0 text-right">
                      {CELL_WIDTH} x {CELL_HEIGHT}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-stone-300 pb-2.5 dark:border-stone-700">
                    <dt className={mutedText}>Sheet</dt>
                    <dd className="m-0 text-right">
                      {ATLAS_COLUMNS} x {ATLAS_ROWS}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-stone-300 pb-2.5 dark:border-stone-700">
                    <dt className={mutedText}>Frame</dt>
                    <dd className="m-0 text-right">
                      {frame + 1} / {selectedState.durations.length}
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </section>
      </section>

      <section className="mx-auto mt-11 max-w-[1180px] scroll-mt-[82px] pb-7 sm:scroll-mt-[104px]" id="install" aria-label="Installation">
        <div className="mb-3 flex items-end justify-between gap-6">
          <span className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300">Install</span>
        </div>

        <div className="grid gap-[18px] lg:grid-cols-2">
          {installCards.map(({ title, description, command }) => (
            <article className={cx("grid gap-4 rounded-lg border p-[18px]", card)} key={title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="m-0 text-[15px] font-bold">{title}</h3>
                  <p className={cx("mt-2 mb-0 text-[12px]", mutedText)}>{description}</p>
                </div>
                <button
                  className={cx(
                    "shrink-0 rounded-md border px-3 py-1.5 text-[12px] font-bold transition",
                    copiedCommand === command
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isDark
                        ? "border-stone-700 bg-stone-800 text-stone-100 hover:border-emerald-300"
                        : "border-stone-300 bg-white text-stone-900 hover:border-emerald-700",
                  )}
                  onClick={() => copyCommand(command)}
                  type="button"
                >
                  {copiedCommand === command ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="m-0 overflow-x-auto rounded-lg border border-stone-700 bg-stone-950 p-3.5 text-stone-100">
                <code className="font-mono text-[12px] leading-6">{command}</code>
              </pre>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
