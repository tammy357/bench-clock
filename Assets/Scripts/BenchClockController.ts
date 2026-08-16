type StepType = 'ACTIVE' | 'WAIT'

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

interface RunState {
  protocol: Protocol
  view: RunView
  stepIndex: number
  remainingSeconds: number
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

@component
export class BenchClockController extends BaseScriptComponent {
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

  private runs: RunState[] = []

  onAwake(): void {
    this.createEvent('OnStartEvent').bind(() => this.onStart())
    this.createEvent('UpdateEvent').bind(() => this.onUpdate())
  }

  private onStart(): void {
    if (!this.hasAllInputs()) {
      console.error('[BenchClock] Missing Text @input(s); controller disabled.')
      this.enabled = false
      return
    }

    this.runs = [
      this.createRun(WESTERN_BLOT, {
        title: this.runATitle,
        stepName: this.runAStepName,
        countdown: this.runACountdown
      }),
      this.createRun(PLASMID_MINIPREP, {
        title: this.runBTitle,
        stepName: this.runBStepName,
        countdown: this.runBCountdown
      }),
      this.createRun(CELL_PASSAGE, {
        title: this.runCTitle,
        stepName: this.runCStepName,
        countdown: this.runCCountdown
      })
    ]

    this.runs.forEach((run) => {
      run.view.title.text = run.protocol.name
    })
  }

  private createRun(protocol: Protocol, view: RunView): RunState {
    const stepIndex = protocol.startStepIndex
    return {
      protocol,
      view,
      stepIndex,
      remainingSeconds: protocol.steps[stepIndex].durationSeconds
    }
  }

  private hasAllInputs(): boolean {
    const inputs: Text[] = [
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
    return inputs.every((input) => !isNull(input))
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
    const step = this.currentStep(run)
    if (step === null || step.type !== 'WAIT') {
      return
    }
    run.remainingSeconds = Math.max(0, run.remainingSeconds - deltaTime)
  }

  private renderRun(run: RunState): void {
    const step = this.currentStep(run)
    if (step === null) {
      run.view.stepName.text = 'RUN COMPLETE'
      run.view.countdown.text = '--:--'
      return
    }
    run.view.stepName.text = step.name
    run.view.countdown.text = this.formatMinutesSeconds(run.remainingSeconds)
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

  /** Advances a run to its next step. Called by the pinch handler once gesture input is wired. */
  advanceStep(run: RunState): void {
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
