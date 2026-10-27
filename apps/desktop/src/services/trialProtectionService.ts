import { invoke } from '@tauri-apps/api/core';
import { getSavedSerial } from './licenseService';

export interface TrialStatus {
  is_trial: boolean;
  is_expired: boolean;
  is_licensed: boolean;
  days_left: number;
  total_days: number;
  machine_id: string;
  is_tampered: boolean;
  first_run_timestamp: number;
  max_seen_timestamp: number;
  accumulated_seconds: number;
}

const LOCAL_STORAGE_TRIAL_KEY = 'vollen_sys_trial_state_v1';

/**
 * Fallback seguro no navegador caso esteja rodando fora do Tauri
 */
function getWebFallbackStatus(isHeartbeat: boolean = false): TrialStatus {
  const TOTAL_DAYS = 10;
  const TOTAL_SECONDS = TOTAL_DAYS * 86400;
  const now = Math.floor(Date.now() / 1000);

  let state: any = null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TRIAL_KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}

  const hasSerial = Boolean(getSavedSerial());

  if (!state) {
    state = {
      machine_id: 'WEB-CLIENT-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      first_run: now,
      max_seen_time: now,
      accumulated_seconds: 0,
      is_licensed: hasSerial,
      tampered: false,
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_TRIAL_KEY, JSON.stringify(state));
    } catch {}
  }

  // Verifica manipulação de relógio
  if (now + 7200 < state.max_seen_time) {
    state.tampered = true;
  }
  state.max_seen_time = Math.max(state.max_seen_time || now, now);

  // Incrementa tempo se for heartbeat
  if (isHeartbeat) {
    state.accumulated_seconds = (state.accumulated_seconds || 0) + 60;
  }
  state.is_licensed = hasSerial;

  try {
    localStorage.setItem(LOCAL_STORAGE_TRIAL_KEY, JSON.stringify(state));
  } catch {}

  if (hasSerial) {
    return {
      is_trial: false,
      is_expired: false,
      is_licensed: true,
      days_left: 9999,
      total_days: TOTAL_DAYS,
      machine_id: state.machine_id,
      is_tampered: false,
      first_run_timestamp: state.first_run,
      max_seen_timestamp: state.max_seen_time,
      accumulated_seconds: state.accumulated_seconds,
    };
  }

  const elapsedCalendar = Math.max(0, state.max_seen_time - state.first_run);
  const effectiveElapsed = Math.max(elapsedCalendar, state.accumulated_seconds);
  const is_expired = state.tampered || effectiveElapsed >= TOTAL_SECONDS;
  const seconds_left = Math.max(0, TOTAL_SECONDS - effectiveElapsed);
  const days_left = is_expired ? 0 : Math.min(TOTAL_DAYS, Math.max(1, Math.ceil(seconds_left / 86400)));

  return {
    is_trial: true,
    is_expired,
    is_licensed: false,
    days_left,
    total_days: TOTAL_DAYS,
    machine_id: state.machine_id,
    is_tampered: state.tampered,
    first_run_timestamp: state.first_run,
    max_seen_timestamp: state.max_seen_time,
    accumulated_seconds: state.accumulated_seconds,
  };
}

/**
 * Consulta o status atual do Trial seguro
 */
export async function fetchSystemTrialStatus(): Promise<TrialStatus> {
  const hasSerial = Boolean(getSavedSerial());

  try {
    const res = await invoke<TrialStatus>('get_system_trial_status');
    if (hasSerial) {
      return {
        ...res,
        is_licensed: true,
        is_trial: false,
        is_expired: false,
        days_left: 9999,
      };
    }
    const isExpired = res.is_expired;
    return {
      ...res,
      is_licensed: false,
      is_trial: !isExpired,
      days_left: isExpired ? 0 : Math.max(0, Math.min(res.total_days, res.days_left)),
    };
  } catch (err) {
    return getWebFallbackStatus();
  }
}

/**
 * Envia o tick / pulso de execução periódico (heartbeat)
 */
export async function sendTrialHeartbeat(): Promise<TrialStatus> {
  const hasSerial = Boolean(getSavedSerial());

  try {
    const res = await invoke<TrialStatus>('heartbeat_trial_tick');
    if (hasSerial) {
      return {
        ...res,
        is_licensed: true,
        is_trial: false,
        is_expired: false,
        days_left: 9999,
      };
    }
    const isExpired = res.is_expired;
    return {
      ...res,
      is_licensed: false,
      is_trial: !isExpired,
      days_left: isExpired ? 0 : Math.max(0, Math.min(res.total_days, res.days_left)),
    };
  } catch (err) {
    return getWebFallbackStatus(true);
  }
}

/**
 * Ativa permanentemente o sistema no nível de hardware
 */
export async function activatePermanentLicense(serial: string): Promise<TrialStatus> {
  try {
    const res = await invoke<TrialStatus>('activate_system_permanent_license', { serial });
    return res;
  } catch (err) {
    const fb = getWebFallbackStatus();
    fb.is_licensed = true;
    fb.is_trial = false;
    fb.is_expired = false;
    fb.days_left = 9999;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_TRIAL_KEY,
        JSON.stringify({
          ...fb,
          is_licensed: true,
          license_serial: serial,
        })
      );
    } catch {}
    return fb;
  }
}

/**
 * Desativa a licença permanente no nível de hardware e retoma o status de Trial (calculando os dias restantes)
 */
export async function deactivatePermanentLicense(): Promise<TrialStatus> {
  try {
    const res = await invoke<TrialStatus>('deactivate_system_permanent_license');
    return res;
  } catch (err) {
    const fb = getWebFallbackStatus();
    fb.is_licensed = false;
    try {
      localStorage.removeItem(LOCAL_STORAGE_TRIAL_KEY);
    } catch {}
    return getWebFallbackStatus();
  }
}

