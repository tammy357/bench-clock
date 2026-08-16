import { Interactable } from 'SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable'

/** Matches the Background quad on each RunPanel, so the pinch target covers the visible panel. */
const PANEL_WIDTH_CM = 13
const PANEL_HEIGHT_CM = 14
const PANEL_DEPTH_CM = 4

/** Matches the ProgressTrack quad the fill slides across. */
const BAR_WIDTH_CM = 11
const BAR_HEIGHT_CM = 0.45

/** Cycles per second of the expiry pulse. */
const PULSE_HZ = 1

/**
 * Shown in place of a countdown on hands-on steps. Kept to two characters so it
 * sits at the countdown type size, on the countdown baseline, in a 13cm panel.
 */
const ACTIVE_LABEL = 'GO'

type StepType = 'ACTIVE' | 'WAIT'

/**
 * Backplate colour carries state, not identity: every run rests on the same neutral
 * and warms only while hands-on. Run identity lives in the accent, used for the
 * protocol name, the progress fill and the expiry pulse.
 */
interface RunTheme {
  accent: vec4
}

interface ProtocolStep {
  name: string
  durationSeconds: number
  type: StepType
}

interface Protocol {
  name: string
  steps: ProtocolStep[]
  /** Step the run is already partway through when the Lens starts, so the demo has live timers. */
  startStepIndex: number
}

interface RunView {
  title: Text
  stepName: Text
  countdown: Text
}

interface RunConfig {
  protocol: Protocol
  theme: RunTheme
  view: RunView
  panel: SceneObject
  backplate: Material
  /** Quad that slides and stretches across the ProgressTrack. */
  progressFill: SceneObject
}

interface RunState extends RunConfig {
  stepIndex: number
  remainingSeconds: number
  audio: AudioComponent | null
  /** Set when a WAIT timer reaches zero, cleared by the acknowledging pinch. */
  alerting: boolean
  alertSeconds: number
}

const WESTERN_BLOT: Protocol = {
  name: 'WESTERN BLOT',
  startStepIndex: 1,
  steps: [
    { name: 'Assemble transfer sandwich', durationSeconds: 300, type: 'ACTIVE' },
    { name: 'Wet transfer, 100 V', durationSeconds: 3600, type: 'WAIT' },
    { name: 'Rinse membrane in TBST', durationSeconds: 120, type: 'ACTIVE' },
    { name: 'Block in 5% milk', durationSeconds: 1800, type: 'WAIT' },
    { name: 'Add primary antibody', durationSeconds: 180, type: 'ACTIVE' },
    { name: 'Primary incubation', durationSeconds: 3600, type: 'WAIT' },
    { name: 'Wash 3x TBST', durationSeconds: 600, type: 'ACTIVE' },
    { name: 'Secondary incubation', durationSeconds: 2700, type: 'WAIT' },
    { name: 'ECL develop and image', durationSeconds: 300, type: 'ACTIVE' }
  ]
}

const PLASMID_MINIPREP: Protocol = {
  name: 'PLASMID MINIPREP',
  startStepIndex: 4,
  steps: [
    { name: 'Pellet 5 mL overnight culture', durationSeconds: 120, type: 'ACTIVE' },
    { name: 'Resuspend in P1 buffer', durationSeconds: 90, type: 'ACTIVE' },
    { name: 'Add P2, invert to lyse', durationSeconds: 300, type: 'WAIT' },
    { name: 'Neutralise with N3, invert', durationSeconds: 60, type: 'ACTIVE' },
    { name: 'Centrifuge lysate', durationSeconds: 600, type: 'WAIT' },
    { name: 'Load supernatant on column', durationSeconds: 120, type: 'ACTIVE' },
    { name: 'Wash with PE buffer', durationSeconds: 90, type: 'ACTIVE' },
    { name: 'Air-dry column', durationSeconds: 120, type: 'WAIT' },
    { name: 'Elute in 50 uL EB', durationSeconds: 60, type: 'WAIT' }
  ]
}

const CELL_PASSAGE: Protocol = {
  name: 'HEK293 PASSAGE',
  startStepIndex: 2,
  steps: [
    { name: 'Aspirate medium, wash PBS', durationSeconds: 120, type: 'ACTIVE' },
    { name: 'Add trypsin-EDTA', durationSeconds: 60, type: 'ACTIVE' },
    { name: 'Trypsin incubation, 37 C', durationSeconds: 300, type: 'WAIT' },
    { name: 'Neutralise with medium', durationSeconds: 90, type: 'ACTIVE' },
    { name: 'Centrifuge 200 x g', durationSeconds: 300, type: 'WAIT' },
    { name: 'Resuspend pellet', durationSeconds: 90, type: 'ACTIVE' },
    { name: 'Count on haemocytometer', durationSeconds: 300, type: 'ACTIVE' },
    { name: 'Seed new flasks', durationSeconds: 180, type: 'ACTIVE' },
    { name: 'Return to incubator', durationSeconds: 1800, type: 'WAIT' }
  ]
}

/** Built on call rather than at module scope so the vec4 globals are guaranteed ready. */
function runThemes(): RunTheme[] {
  return [
    { accent: new vec4(1, 0.65, 0.1, 1) },
    { accent: new vec4(0.15, 0.8, 1, 1) },
    { accent: new vec4(1, 0.3, 0.7, 1) }
  ]
}

/** Resting plate colour, matching the authored materials so frame one does not shift. */
function neutralPlate(): vec4 {
  return new vec4(0.16, 0.17, 0.19, 1)
}

/** Plate wash while a step is hands-on, readable from peripheral vision. */
function activePlate(): vec4 {
  return new vec4(0.34, 0.22, 0.07, 1)
}

@component
export class BenchClockController extends BaseScriptComponent {
  @input
  @hint('RunPanel_A — receives the Interactable for pinch-to-advance')
  runAPanel: SceneObject

  @input
  @hint('RunPanel_B — receives the Interactable for pinch-to-advance')
  runBPanel: SceneObject

  @input
  @hint('RunPanel_C — receives the Interactable for pinch-to-advance')
  runCPanel: SceneObject

  @input
  @hint('RunPanel_A / Title')
  runATitle: Text

  @input
  @hint('RunPanel_A / StepName')
  runAStepName: Text

  @input
  @hint('RunPanel_A / Countdown')
  runACountdown: Text

  @input
  @hint('RunPanel_B / Title')
  runBTitle: Text

  @input
  @hint('RunPanel_B / StepName')
  runBStepName: Text

  @input
  @hint('RunPanel_B / Countdown')
  runBCountdown: Text

  @input
  @hint('RunPanel_C / Title')
  runCTitle: Text

  @input
  @hint('RunPanel_C / StepName')
  runCStepName: Text

  @input
  @hint('RunPanel_C / Countdown')
  runCCountdown: Text

  @input
  @hint('NextUpPanel / Label')
  nextUpLabel: Text

  @input
  @hint('NextUpPanel / Countdown')
  nextUpCountdown: Text

  @input
  @hint('Material on RunPanel_A / Background')
  runABackplate: Material

  @input
  @hint('Material on RunPanel_B / Background')
  runBBackplate: Material

  @input
  @hint('Material on RunPanel_C / Background')
  runCBackplate: Material

  @input
  @hint('RunPanel_A / ProgressFill')
  runAProgressFill: SceneObject

  @input
  @hint('RunPanel_B / ProgressFill')
  runBProgressFill: SceneObject

  @input
  @hint('RunPanel_C / ProgressFill')
  runCProgressFill: SceneObject

  @input
  @allowUndefined
  @hint('Optional. Played once when a WAIT timer expires; the pulse runs with or without it.')
  alertSound: AudioTrackAsset

  private runs: RunState[] = []
  private countdownColor: vec4
  private neutralColor: vec4
  private activeColor: vec4

  onAwake(): void {
    if (!this.hasAllInputs()) {
      console.error('[BenchClock] Missing @input(s); controller disabled.')
      this.enabled = false
      return
    }

    this.countdownColor = new vec4(1, 1, 1, 1)
    this.neutralColor = neutralPlate()
    this.activeColor = activePlate()

    const themes = runThemes()
    this.runs = [
      this.createRun({
        protocol: WESTERN_BLOT,
        theme: themes[0],
        panel: this.runAPanel,
        backplate: this.runABackplate,
        progressFill: this.runAProgressFill,
        view: {
          title: this.runATitle,
          stepName: this.runAStepName,
          countdown: this.runACountdown
        }
      }),
      this.createRun({
        protocol: PLASMID_MINIPREP,
        theme: themes[1],
        panel: this.runBPanel,
        backplate: this.runBBackplate,
        progressFill: this.runBProgressFill,
        view: {
          title: this.runBTitle,
          stepName: this.runBStepName,
          countdown: this.runBCountdown
        }
      }),
      this.createRun({
        protocol: CELL_PASSAGE,
        theme: themes[2],
        panel: this.runCPanel,
        backplate: this.runCBackplate,
        progressFill: this.runCProgressFill,
        view: {
          title: this.runCTitle,
          stepName: this.runCStepName,
          countdown: this.runCCountdown
        }
      })
    ]

    // SIK components must be created in onAwake, but their events bound in OnStartEvent.
    const interactables = this.runs.map((run) => this.ensureInteractable(run.panel))

    this.createEvent('OnStartEvent').bind(() => {
      this.runs.forEach((run, index) => {
        interactables[index].onTriggerStart.add(() => this.advanceStep(run))
      })
    })
    this.createEvent('UpdateEvent').bind(() => this.onUpdate())
  }

  private createRun(config: RunConfig): RunState {
    const stepIndex = config.protocol.startStepIndex
    const run: RunState = {
      ...config,
      stepIndex,
      remainingSeconds: config.protocol.steps[stepIndex].durationSeconds,
      audio: this.createAlertAudio(config.panel),
      alerting: false,
      alertSeconds: 0
    }
    return run
  }

  /** Returns null when no alert track is wired, leaving the pulse as the only expiry cue. */
  private createAlertAudio(panel: SceneObject): AudioComponent | null {
    if (isNull(this.alertSound)) {
      return null
    }
    const audio = panel.createComponent('Component.AudioComponent')
    audio.audioTrack = this.alertSound
    return audio
  }

  /** Adds a box collider sized to the panel plus an Interactable, reusing either if already present. */
  private ensureInteractable(panel: SceneObject): Interactable {
    if (isNull(panel.getComponent('Physics.ColliderComponent'))) {
      const collider = panel.createComponent('Physics.ColliderComponent')
      const box = Shape.createBoxShape()
      box.size = new vec3(PANEL_WIDTH_CM, PANEL_HEIGHT_CM, PANEL_DEPTH_CM)
      collider.shape = box
    }

    const existing = panel.getComponent(Interactable.getTypeName()) as Interactable
    if (!isNull(existing)) {
      return existing
    }
    return panel.createComponent(Interactable.getTypeName()) as Interactable
  }

  private hasAllInputs(): boolean {
    const panels: SceneObject[] = [
      this.runAPanel,
      this.runBPanel,
      this.runCPanel,
      this.runAProgressFill,
      this.runBProgressFill,
      this.runCProgressFill
    ]
    const texts: Text[] = [
      this.runATitle,
      this.runAStepName,
      this.runACountdown,
      this.runBTitle,
      this.runBStepName,
      this.runBCountdown,
      this.runCTitle,
      this.runCStepName,
      this.runCCountdown,
      this.nextUpLabel,
      this.nextUpCountdown
    ]
    const backplates: Material[] = [
      this.runABackplate,
      this.runBBackplate,
      this.runCBackplate
    ]
    return (
      panels.every((panel) => !isNull(panel)) &&
      texts.every((text) => !isNull(text)) &&
      backplates.every((material) => !isNull(material))
    )
  }

  private onUpdate(): void {
    if (this.runs.length === 0) {
      return
    }

    const deltaTime = getDeltaTime()
    this.runs.forEach((run) => {
      this.tickRun(run, deltaTime)
      this.renderRun(run)
    })
    this.renderNextUp()
  }

  private tickRun(run: RunState, deltaTime: number): void {
    if (run.alerting) {
      run.alertSeconds += deltaTime
      return
    }

    const step = this.currentStep(run)
    if (step === null || step.type !== 'WAIT') {
      return
    }

    run.remainingSeconds = Math.max(0, run.remainingSeconds - deltaTime)
    if (run.remainingSeconds === 0) {
      this.beginAlert(run)
    }
  }

  private beginAlert(run: RunState): void {
    run.alerting = true
    run.alertSeconds = 0
    if (run.audio !== null) {
      run.audio.play(1)
    }
  }

  private renderRun(run: RunState): void {
    const step = this.currentStep(run)
    this.renderBackplate(run, step)

    // Rewritten every frame rather than once at start, so a live property sync
    // from the editor cannot leave the placeholder text showing.
    run.view.title.text = run.protocol.name

    if (step === null) {
      run.view.stepName.text = 'COMPLETE'
      run.view.countdown.text = '--:--'
      run.view.countdown.textFill.color = this.countdownColor
      run.progressFill.enabled = false
      return
    }

    run.view.stepName.text = step.name

    // Hands-on steps have no timer to show, so the panel calls for attention instead.
    if (step.type === 'ACTIVE') {
      run.view.countdown.text = ACTIVE_LABEL
      run.view.countdown.textFill.color = run.theme.accent
      run.progressFill.enabled = false
      return
    }

    run.view.countdown.text = this.formatMinutesSeconds(run.remainingSeconds)
    run.view.countdown.textFill.color = this.countdownColor
    this.renderProgress(run, step)
  }

  /** Grows the fill from the track's left edge, since the quad scales about its centre. */
  private renderProgress(run: RunState, step: ProtocolStep): void {
    const elapsed = step.durationSeconds - run.remainingSeconds
    const fraction =
      step.durationSeconds <= 0 ? 0 : Math.min(1, Math.max(0, elapsed / step.durationSeconds))
    if (fraction <= 0) {
      run.progressFill.enabled = false
      return
    }

    run.progressFill.enabled = true
    const width = BAR_WIDTH_CM * fraction
    const transform = run.progressFill.getTransform()
    const current = transform.getLocalPosition()
    transform.setLocalScale(new vec3(width, 1, BAR_HEIGHT_CM))
    transform.setLocalPosition(new vec3(width / 2 - BAR_WIDTH_CM / 2, current.y, current.z))
  }

  /**
   * Drives the plate straight from state each frame: pulsing accent while an expiry is
   * unacknowledged, a warm wash while hands-on, otherwise the shared neutral.
   */
  private renderBackplate(run: RunState, step: ProtocolStep | null): void {
    if (run.alerting) {
      const phase = 0.5 - 0.5 * Math.cos(2 * Math.PI * PULSE_HZ * run.alertSeconds)
      this.setBackplateColor(run, vec4.lerp(this.neutralColor, run.theme.accent, phase))
      return
    }

    const isHandsOn = step !== null && step.type === 'ACTIVE'
    this.setBackplateColor(run, isHandsOn ? this.activeColor : this.neutralColor)
  }

  private setBackplateColor(run: RunState, color: vec4): void {
    run.backplate.mainPass.baseColor = color
  }

  private renderNextUp(): void {
    let soonest: RunState | null = null
    for (const run of this.runs) {
      const step = this.currentStep(run)
      if (step === null || step.type !== 'WAIT' || run.remainingSeconds <= 0) {
        continue
      }
      if (soonest === null || run.remainingSeconds < soonest.remainingSeconds) {
        soonest = run
      }
    }

    if (soonest === null) {
      this.nextUpLabel.text = 'NEXT UP'
      this.nextUpCountdown.text = '--:--'
      return
    }
    this.nextUpLabel.text = soonest.protocol.name
    this.nextUpCountdown.text = this.formatMinutesSeconds(soonest.remainingSeconds)
  }

  /** Advances a run to its next step, doubling as the acknowledgement for a pulsing alert. */
  advanceStep(run: RunState): void {
    if (run.alerting) {
      run.alerting = false
      run.alertSeconds = 0
      if (run.audio !== null) {
        run.audio.stop(false)
      }
    }

    if (run.stepIndex >= run.protocol.steps.length) {
      return
    }
    run.stepIndex += 1
    const step = this.currentStep(run)
    run.remainingSeconds = step === null ? 0 : step.durationSeconds
  }

  private currentStep(run: RunState): ProtocolStep | null {
    if (run.stepIndex < 0 || run.stepIndex >= run.protocol.steps.length) {
      return null
    }
    return run.protocol.steps[run.stepIndex]
  }

  /**
   * Minutes are not wrapped at 60, so a 90 minute incubation reads "90:00" rather
   * than rolling over to "30:00".
   */
  private formatMinutesSeconds(seconds: number): string {
    const total = Math.max(0, Math.ceil(seconds))
    const minutes = Math.floor(total / 60)
    const remainder = total % 60
    return `${this.padTwo(minutes)}:${this.padTwo(remainder)}`
  }

  private padTwo(value: number): string {
    return value < 10 ? `0${value}` : `${value}`
  }
}
