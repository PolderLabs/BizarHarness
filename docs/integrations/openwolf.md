# OpenWolf integration

Bizar treats [OpenWolf](https://github.com/cytostack/openwolf) as an external
project-memory and context runtime. The tested release is `openwolf@2.5.1`.

OpenWolf is AGPL-3.0-only and is not vendored, linked, or copied into Bizar's
MIT package. Bizar invokes its CLI as a separate process and records only the
runtime version/ownership metadata needed for repair and uninstall.

OpenWolf owns `.wolf/` project memory, context hooks, anatomy/index data,
handoffs, and bug memory. Bizar owns execution policy, capability selection,
evidence, and global user learning. Work-state authority remains exclusive:
OpenKan is used in standalone mode; Agent Orchestrator is used in AO mode.

`bizar uninstall` leaves `.wolf/` and a pre-existing OpenWolf installation in
place. `--purge-openwolf-runtime` is an explicit global-runtime cleanup option;
it never deletes project memory.
