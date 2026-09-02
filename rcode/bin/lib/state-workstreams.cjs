'use strict';
/**
 * state-workstreams.cjs — `state <sub>` workstream branches, extracted
 * from cmdState() in rcode-tools.cjs (#204 step 3).
 *
 * Covers: workstream-validate, workstream-create, workstream-switch,
 * workstream-list, workstream-status, workstream-complete.
 *
 * Deps are injected via the `deps` object (same pattern as lib/phase.cjs).
 */

const fs = require('fs');
const path = require('path');

function dispatch(subArgs, deps) {
  const {
    readState,
    writeState,
    writeStateCompact,
    defaultState,
    migrateState,
    parseFlags,
    PLANNING_DIR,
    PROJECT_ROOT,
    RCODE_DIR,
    STATE_PATH,
  } = deps;
  const statePath = STATE_PATH;
  const sub = subArgs[0];

  if (sub === 'workstream-validate') {
    const subcommand = subArgs[1];
    const flags = parseFlags(2);
    const name = flags.name || '';

    if (!subcommand || !['create', 'switch', 'list', 'status', 'complete'].includes(subcommand)) {
      throw new Error(`Invalid workstream subcommand: ${subcommand}. Valid: create, switch, list, status, complete`);
    }

    if (['create', 'switch', 'complete'].includes(subcommand) && !name) {
      throw new Error(`workstream ${subcommand} requires --name <name>`);
    }

    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];

    if (subcommand === 'create') {
      if (state.workstreams.some((w) => w.name === name)) {
        throw new Error(`Workstream already exists: ${name}`);
      }
    } else if (['switch', 'complete'].includes(subcommand)) {
      if (!state.workstreams.some((w) => w.name === name)) {
        throw new Error(`Workstream not found: ${name}`);
      }
    }

    return { ok: true, valid: true };
  }

  // --- workstream-create ---
  if (sub === 'workstream-create') {
    const flags = parseFlags(1);
    const name = flags.name || '';
    if (!name) throw new Error('workstream-create requires --name <name>');

    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];
    if (state.workstreams.some((w) => w.name === name)) {
      throw new Error(`Workstream already exists: ${name}`);
    }

    // Create new workstream
    const now = new Date().toISOString();
    const id = `ws-${Date.now().toString(36).slice(-8)}`;
    const newWorkstream = {
      name,
      id,
      created: now,
      active: true,
      completed: false,
      phases: [],
    };

    // Deactivate other workstreams
    state.workstreams.forEach((w) => { w.active = false; });
    state.workstreams.push(newWorkstream);
    state.active_workstream = name;

    return writeState(state);
  }

  // --- workstream-switch ---
  if (sub === 'workstream-switch') {
    const flags = parseFlags(1);
    const name = flags.name || '';
    if (!name) throw new Error('workstream-switch requires --name <name>');

    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];

    const ws = state.workstreams.find((w) => w.name === name);
    if (!ws) throw new Error(`Workstream not found: ${name}`);

    // Deactivate others, activate target
    state.workstreams.forEach((w) => { w.active = w.name === name; });
    state.active_workstream = name;

    return writeState(state);
  }

  // --- workstream-list ---
  if (sub === 'workstream-list') {
    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];

    return {
      ok: true,
      workstreams: state.workstreams.map((w) => ({
        name: w.name,
        id: w.id || '',
        active: w.active || false,
        completed: w.completed || false,
        phases: (w.phases || []).length,
        created: w.created || '',
      })),
    };
  }

  // --- workstream-status ---
  if (sub === 'workstream-status') {
    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];

    const active = state.workstreams.find((w) => w.active) || state.workstreams[0];
    if (!active) {
      return { ok: true, workstream: null, message: 'No workstreams exist' };
    }

    return {
      ok: true,
      workstream: {
        name: active.name,
        id: active.id || '',
        active: active.active || false,
        completed: active.completed || false,
        phases: (active.phases || []).length,
        created: active.created || '',
      },
    };
  }

  // --- workstream-complete ---
  if (sub === 'workstream-complete') {
    const flags = parseFlags(1);
    const name = flags.name || '';
    if (!name) throw new Error('workstream-complete requires --name <name>');

    const state = readState() || defaultState();
    if (!state.workstreams) state.workstreams = [];

    const ws = state.workstreams.find((w) => w.name === name);
    if (!ws) throw new Error(`Workstream not found: ${name}`);
    if (ws.completed) throw new Error(`Workstream already completed: ${name}`);

    ws.completed = true;
    ws.active = false;

    // If this was the active workstream, switch to first incomplete
    if (state.active_workstream === name) {
      const next = state.workstreams.find((w) => !w.completed);
      if (next) {
        next.active = true;
        state.active_workstream = next.name;
      } else {
        state.active_workstream = null;
      }
    }

    return writeState(state);
  }

  return undefined;
}

module.exports = { dispatch };
