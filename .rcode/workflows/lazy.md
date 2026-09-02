<purpose>
Apply the "lazy senior dev" lens — force the simplest solution that actually
works (YAGNI, stdlib before custom code, native platform features before
dependencies, one line before fifty) before any code is written. This workflow
is a thin entry point: it hands off to the `rcode-lazy` skill, which carries the
full methodology.
</purpose>

<process>

<step name="dispatch">
Invoke the `rcode-lazy` skill (via the Skill tool) and apply it to `$ARGUMENTS`.

`rcode-lazy` is the always-on lazy-senior-dev lens. It questions whether the
task needs to exist, reaches for the standard library before custom code and
native platform features before dependencies, and prefers the shortest solution
that passes. It supports intensity levels — `lite`, `full` (default), `ultra` —
so pass `--intensity=<level>` through if the user provided one.

If no arguments were given, ask the user what they want simplified before
invoking the skill.
</step>

</process>

<success_criteria>
- [ ] `rcode-lazy` skill invoked with the user's challenge
- [ ] Intensity flag passed through when supplied
- [ ] No work done here directly — this workflow only dispatches to the skill
</success_criteria>
