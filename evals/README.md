# Evals

Cases for `claude plugin eval`, in the `prompt.md` + `graders/*.md` layout.

```bash
claude plugin eval . --ablation with-without
claude plugin eval . --case concentrated-pnl
```

The ablation arm matters more than the absolute score here: these cases test
whether the **skills** change Claude's answer, and a case that scores the same
with and without the plugin is a case the plugin is not earning.

> **Status: not yet executed.** `claude plugin eval` is in early access and was
> not enabled on the account these were written on. The cases are written but
> unrun — do not treat them as passing until someone with access runs them.
