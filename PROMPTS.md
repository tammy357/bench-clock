# Bench Clock — CLAD Prompt Log

Lens Studio 5.23 (SPECS 27) + Cursor with the ls-clad plugin over the
lens-studio MCP.

## 1. MCP smoke test
> Using the lens-studio MCP, list the scene objects currently in this project
> and tell me the project's target platform.

Verified the round-trip was live before committing to a build. Returned the
untouched SPECS Base Template over GraphQL with real UUIDs and a 9ms execution
time.

## 2. One-shot build attempt — failed twice
> Build a SPECS Lens called "Bench Clock" — a spatial experiment planner for
> wet-lab scientists running multiple protocols in parallel. [full spec: three
> world-space run panels with ACTIVE/WAIT steps, a Next Up panel showing the
> soonest-expiring timer, pinch to advance, expiry pulse, seeded protocols]

Handed to the SPECS Experience Builder subagent. It first blocked on an
Editor.IAuthorization check reporting isAuthorized false — a false negative; I
verified I was sigia the Lens Studio profile menu. It then terminated
with "Connection failed repeatedly", having written nothing. Restarted; the
second attempt also produced no scene objects. Four hours, zero output.

## 3. Pivot — bounded, steered construction
> Don't spawn a subagent; do this yourself using the lens-studio MCP editor
> tools. Create the scene hierarchy for Bench Clock: RunPanel_A/B/C each with a
> background quad and Title, StepName, Countdown text; NextUpPanel with Label
> and Countdown. Nothing else yet — no scripts.

Worked. 19 objects. It caught that the default Lens Studio plane lies flat with
its normal along +Y, so the backgrounds needed standing upright — otherwise all
three panels would have rendered edge-on and invisible. It also raised the text
sizes (the preset default renders ~1.1cm tall in world space, unreadable at
70cm) and toed the outer panels in to face the user.

## 4. Timer controller
> Write BenchClockController.ts holding three hardcoded protocol runs, steps of
> {name, duratinds, type: "ACTIVE" | "WAIT"}. Decrement WAIT timers, write
> step name and MM:SS remaining into each panel, write the soonest-expiring
> timer across all runs into NextUpPanel.

Compiled and verified working — it read live text values back out of the running
scene rather than trusting the compile. Added startStepIndex unprompted so the
seeded runs open partway through on a WAIT step; without it the demo would have
opened with nothing counting down.

## 5. Pinch to advance
> Each RunPanel gets an Interactable so a pinch calls advanceStep for its own
> run. Verify by reading live text back after simulating a pinch.

Verified by pinching RunPanel_B five times to COMPLETE while A and C kept
counting untouched.

Two findings changed the build. The wrap fix I asked for would have done nothing
— overflow is evaluated against a ScreenTransform or layoutRect, and these are
world-space texts with neither, so the property would have been set correctly
and silently had no effect. It gave each label an explicit layect instead.
And the collider was proved rather than assumed: Interactable is itself a script
component, so a runtime query looked empty. Since preview targets by ID, a
passing pinch wouldn't have ruled out a missing collider failing on device. It
confirmed collider=true shape=BoxShape directly.

## 6. Layout and materials
> Panels are too wide-spread for the field of view — only one is visible at a
> time. Fix the spacing and replace the default PBR.mat with unlit materials.

The most valuable finding of the build. The camera reads 63.54 degrees in the
editor, but deviceProperty is set to All, so the device profile overrides it at
runtime — the running Lens reports 0.6386 rad, an 18.3 degree half-angle. My
original 60cm spacing put the outer panels at 40.6 degrees, more than twice the
limit, which is exactly why only the centre panel was ever visible. Corrected to
15cm spacing, verified at 17.3 degrees horizontal against the 18.3 limit.

It also overruled me on the backplates: the display blends additi, so black
adds no light and cannot darken the real world. Near-black plates would have
been invisible against a bright scene. Correct, and I took the change.

## 7. Visual refinement
> Precision-instrument aesthetic, not a consumer AR filter. Strict three-size
> type scale, aligned baselines, colour as state rather than decoration.

It took the constraint further than specified — removing the per-run plate tints
entirely, since tinting plates by run is decorative use of colour. All plates now
share one neutral and run identity lives only in the accent, freeing the plate to
mean exactly one thing: neutral is waiting, warm is your move, pulsing is
expired.

## Not built
Audio alerts (no suitable built-in asset; the expiry pulse carries it visually),
LEAF integration tests, and gaze-to-focus. Verification instead happened per
step by reading live scene state back after each change — less formal, but it is
what caught the layoutRect and collider issues above, both of which compiled
cleanly and would have fd silently.

## Notes
CLAD's one-shot mode and its steered mode fail very differently. The one-shot is
all-or-nothing: a dropped connection cost four hours and produced no partial
state to recover from. Bounded instructions, each verified in the editor, made
every failure cost one step.

The agent was consistently more reliable at observing the editor than asserting
things about it. Everything it established by querying live state was correct
and often better than what I asked for — the flat-plane orientation, the
world-space text sizing, the runtime field of view, the additive display
argument. Its one confident unprompted assertion, that I wasn't signed in, was
wrong and would have blocked the build entirely.

Trust its measurements, check its assertions.
