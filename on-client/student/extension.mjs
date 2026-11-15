// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

const MODE_LABELS = Object.freeze({
  connected: '연결됨',
  demo: '예제 자료',
  disconnected: '연결 없음',
  unknown: '확인 불가',
});

const DEVICE_STATUS_MAP = Object.freeze({
  compliant: { label: '보안 기준 충족', tone: 'ok', className: 'state state-ok' },
  noncompliant: { label: '보안 기준 미충족', tone: 'alert', className: 'state state-error' },
  unknown: { label: '확인 불가', tone: 'unknown', className: 'state state-empty' },
});

const SESSION_STATUS_MAP = Object.freeze({
  active: { label: '활성', tone: 'ok', className: 'state state-ok' },
  expired: { label: '만료', tone: 'alert', className: 'state state-error' },
  revoked: { label: '철회됨', tone: 'alert', className: 'state state-error' },
  unknown: { label: '확인 불가', tone: 'unknown', className: 'state state-empty' },
});

const DECISION_MAP = Object.freeze({
  allow: {
    label: '접근 허용',
    className: 'decision decision-allow',
    note: '정책상 접근 허용 판정입니다. 실제 앱 접속 성공을 보장하지는 않습니다.',
  },
  deny: {
    label: '접근 거부',
    className: 'decision decision-deny',
    note: '정책상 접근 거부 판정입니다.',
  },
  challenge: {
    label: '추가 인증 또는 확인 필요',
    className: 'decision decision-challenge',
    note: '추가 확인이 필요합니다. 이 앱이 추가 인증 절차를 대신 수행하지 않습니다.',
  },
  unknown: {
    label: '판정 확인 불가',
    className: 'decision decision-unknown',
    note: '판정을 확인할 수 없습니다. 허용됨(allow)이 아닙니다.',
  },
});

const ACCESS_STATE_MAP = Object.freeze({
  allowed: { label: '허용됨', tone: 'ok', className: 'state state-ok' },
  denied: { label: '거부됨', tone: 'alert', className: 'state state-error' },
  unknown: { label: '확인 불가', tone: 'unknown', className: 'state state-empty' },
});

const EVENT_KIND_MAP = Object.freeze({
  access: '접속 기록',
  xdr: 'XDR 경보',
});

const eventsViewState = {
  lastDataSignature: null,
  filters: { kind: 'all', appId: 'all', access: 'all' },
  selectedEventId: null,
};

function createEl(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.type) node.setAttribute('type', String(options.type));
  if (options.className) node.className = options.className;
  if (options.text != null) node.textContent = String(options.text);
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value != null) node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child != null && child !== false) node.appendChild(child);
  }
  return node;
}

function normalizeMode(mode) {
  return Object.hasOwn(MODE_LABELS, mode) ? mode : 'unknown';
}

function createModeBadge(mode) {
  const key = normalizeMode(mode);
  const className = key === 'demo' ? 'tag tag-demo' : 'tag';
  return createEl('span', {
    className,
    text: `${MODE_LABELS[key]} (${key})`,
    attrs: { 'data-student-mode': key },
  });
}

function resolveStatusInfo(map, rawStatus) {
  const key = typeof rawStatus === 'string' && Object.hasOwn(map, rawStatus) ? rawStatus : 'unknown';
  return { key, ...map[key] };
}

function createStatusBadge(map, rawStatus, kind) {
  const info = resolveStatusInfo(map, rawStatus);
  const prefix = info.tone === 'alert' ? '[주의] ' : '';
  return createEl('span', {
    className: info.className,
    text: `${prefix}${info.label} (${info.key})`,
    attrs: {
      [`data-student-${kind}-status`]: info.key,
      'data-student-tone': info.tone,
    },
  });
}

function formatErrorMessage(resource) {
  const message = resource?.error?.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return `연결 실패: ${message}`;
  }
  return '연결 실패: 서버 응답을 확인할 수 없습니다.';
}

function renderResourceBlock(title, resource, kind, renderOkContent) {
  const safeResource = resource && typeof resource === 'object' ? resource : { status: 'error', mode: 'unknown' };
  const status = safeResource.status || 'unknown';
  const mode = normalizeMode(safeResource.mode);

  const header = createEl('div', { className: 'row' }, [
    createEl('h3', { text: title }),
    createModeBadge(mode),
  ]);

  const section = createEl('section', {
    className: 'card',
    attrs: {
      'data-student-resource': kind,
      'data-student-status': status,
      'data-student-mode': mode,
    },
  }, [header]);

  if (status === 'loading') {
    section.appendChild(createEl('p', {
      className: 'state state-loading',
      text: `불러오는 중 (${MODE_LABELS[mode]})`,
      attrs: { role: 'status' },
    }));
    return section;
  }

  if (status === 'error') {
    section.appendChild(createEl('p', {
      className: 'state state-error',
      text: `${formatErrorMessage(safeResource)} · ${MODE_LABELS[mode]}`,
      attrs: { role: 'alert' },
    }));
    return section;
  }

  if (status !== 'ok') {
    section.appendChild(createEl('p', {
      className: 'state state-empty',
      text: `확인 불가 (${MODE_LABELS[mode]})`,
    }));
    return section;
  }

  section.appendChild(renderOkContent(safeResource.data));
  return section;
}

function formatNameAndId(label, id) {
  const safeLabel = typeof label === 'string' && label.trim().length > 0 ? label : null;
  const safeId = typeof id === 'string' && id.trim().length > 0 ? id : null;
  if (safeLabel && safeId && safeLabel !== safeId) return `${safeLabel} (${safeId})`;
  return safeLabel || safeId || '확인 불가';
}

function renderMeContent(data) {
  if (!data || typeof data !== 'object' || !data.user || !data.device || !data.session) {
    return createEl('p', { className: 'state state-empty', text: '확인 불가: 사용자·기기·세션 데이터가 올바르지 않습니다.' });
  }

  const list = createEl('dl', { className: 'kv' });

  list.appendChild(createEl('dt', { text: '사용자' }));
  list.appendChild(createEl('dd', {
    text: formatNameAndId(data.user.label, data.user.id),
    attrs: { 'data-student-user-id': data.user.id ?? '' },
  }));

  list.appendChild(createEl('dt', { text: '현재 기기' }));
  list.appendChild(createEl('dd', {}, [
    createEl('span', { text: `${formatNameAndId(data.device.label, data.device.id)} ` }),
    createStatusBadge(DEVICE_STATUS_MAP, data.device.status, 'device'),
  ]));

  list.appendChild(createEl('dt', { text: '현재 세션' }));
  list.appendChild(createEl('dd', {}, [
    createEl('span', { text: `${data.session.id || '확인 불가'} ` }),
    createStatusBadge(SESSION_STATUS_MAP, data.session.status, 'session'),
  ]));

  return list;
}

function renderDevicesContent(data) {
  if (!Array.isArray(data)) {
    return createEl('p', { className: 'state state-empty', text: '확인 불가: 기기 목록 형식이 올바르지 않습니다.' });
  }
  if (data.length === 0) {
    return createEl('p', { className: 'state state-empty', text: '표시할 기기가 없습니다.' });
  }
  const ul = createEl('ul', { className: 'plain-list' });
  for (const device of data) {
    const label = formatNameAndId(device?.label, device?.id);
    ul.appendChild(createEl('li', {}, [
      createEl('span', { className: 'item-title', text: label }),
      createStatusBadge(DEVICE_STATUS_MAP, device?.status, 'device'),
    ]));
  }
  return ul;
}

function renderSessionsContent(data) {
  if (!Array.isArray(data)) {
    return createEl('p', { className: 'state state-empty', text: '확인 불가: 세션 목록 형식이 올바르지 않습니다.' });
  }
  if (data.length === 0) {
    return createEl('p', { className: 'state state-empty', text: '표시할 세션이 없습니다.' });
  }
  const ul = createEl('ul', { className: 'plain-list' });
  for (const session of data) {
    const idText = typeof session?.id === 'string' && session.id.trim().length > 0 ? session.id : '확인 불가';
    ul.appendChild(createEl('li', {}, [
      createEl('span', { className: 'item-title', text: idText }),
      createStatusBadge(SESSION_STATUS_MAP, session?.status, 'session'),
    ]));
  }
  return ul;
}

function formatCheckedAt(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return '확인 불가';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return `${new Date(parsed).toLocaleString('ko-KR')} (${value})`;
}

function resetEventsViewState() {
  eventsViewState.lastDataSignature = null;
  eventsViewState.filters = { kind: 'all', appId: 'all', access: 'all' };
  eventsViewState.selectedEventId = null;
}

function getKindLabel(kind) {
  return Object.hasOwn(EVENT_KIND_MAP, kind) ? `${EVENT_KIND_MAP[kind]} (${kind})` : `확인 불가 (${String(kind || 'unknown')})`;
}

function formatAppIdText(appId) {
  return typeof appId === 'string' && appId.trim().length > 0 ? appId : '앱 확인 불가 (appId 없음)';
}

function sortEventsLatestFirst(events) {
  return [...events].sort((a, b) => {
    const tA = Date.parse(a?.at);
    const tB = Date.parse(b?.at);
    const validA = Number.isFinite(tA);
    const validB = Number.isFinite(tB);
    if (validA && validB) return tB - tA;
    if (validA) return -1;
    if (validB) return 1;
    return 0;
  });
}

function createFilterSelect(labelText, selectId, values, currentValue, formatOption, onChange) {
  const wrapper = createEl('label', { className: 'row', attrs: { for: selectId } }, [
    createEl('span', { className: 'muted', text: labelText }),
  ]);
  const select = createEl('select', {
    className: 'btn',
    attrs: { id: selectId, 'aria-label': labelText },
  });

  const allOption = createEl('option', { text: '전체', attrs: { value: 'all' } });
  select.appendChild(allOption);

  for (const val of values) {
    const opt = createEl('option', { text: formatOption(val), attrs: { value: val } });
    select.appendChild(opt);
  }
  select.value = values.includes(currentValue) ? currentValue : 'all';
  select.addEventListener('change', () => onChange(select.value));

  wrapper.appendChild(select);
  return wrapper;
}

function renderEventDetailPanel(event) {
  const panel = createEl('section', {
    className: 'card',
    attrs: { 'data-student-event-detail': event.id },
  });

  panel.appendChild(createEl('h4', { text: `사건 상세 · ${event.id}` }));

  const metaList = createEl('dl', { className: 'kv' });
  metaList.appendChild(createEl('dt', { text: '사건 ID' }));
  metaList.appendChild(createEl('dd', { text: event.id }));
  metaList.appendChild(createEl('dt', { text: '종류' }));
  metaList.appendChild(createEl('dd', { text: getKindLabel(event.kind) }));
  metaList.appendChild(createEl('dt', { text: '업무 앱' }));
  metaList.appendChild(createEl('dd', { text: formatAppIdText(event.appId) }));
  metaList.appendChild(createEl('dt', { text: '시각' }));
  metaList.appendChild(createEl('dd', { text: formatCheckedAt(event.at) }));
  metaList.appendChild(createEl('dt', { text: '요약' }));
  metaList.appendChild(createEl('dd', { text: event.summary || '요약 없음' }));
  panel.appendChild(metaList);

  const stateList = createEl('dl', { className: 'kv' });
  stateList.appendChild(createEl('dt', { text: '접속 상태' }));
  stateList.appendChild(createEl('dd', {}, [createStatusBadge(ACCESS_STATE_MAP, event?.state?.access, 'access')]));
  stateList.appendChild(createEl('dt', { text: '세션 상태' }));
  stateList.appendChild(createEl('dd', {}, [createStatusBadge(SESSION_STATUS_MAP, event?.state?.session, 'session')]));
  stateList.appendChild(createEl('dt', { text: '기기 상태' }));
  stateList.appendChild(createEl('dd', {}, [createStatusBadge(DEVICE_STATUS_MAP, event?.state?.device, 'device')]));
  panel.appendChild(stateList);

  const renderNamedRows = (heading, rows, emptyMsg) => {
    const block = createEl('div', { className: 'event-block' });
    block.appendChild(createEl('h4', { text: heading }));
    if (!Array.isArray(rows) || rows.length === 0) {
      block.appendChild(createEl('p', { className: 'muted', text: emptyMsg }));
      return block;
    }
    const ul = createEl('ul');
    for (const row of rows) {
      const idPart = row?.id || 'unknown';
      const textPart = row?.text || '내용 없음';
      ul.appendChild(createEl('li', { text: `${idPart}: ${textPart}` }));
    }
    block.appendChild(ul);
    return block;
  };

  panel.appendChild(createEl('div', { className: 'grid-2' }, [
    renderNamedRows('근거 (evidence)', event.evidence, '등록된 근거가 없습니다.'),
    renderNamedRows('규칙 (rules)', event.rules, '적용된 규칙이 없습니다.'),
  ]));

  if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
    const actionsRow = createEl('div', { className: 'event-actions' });
    for (const action of event.supportedActions) {
      if (typeof action !== 'string' || action.trim().length === 0) continue;
      actionsRow.appendChild(createEl('button', {
        type: 'button',
        className: 'btn',
        text: `${action} 미지원`,
        attrs: { disabled: 'true', 'aria-disabled': 'true' },
      }));
    }
    if (actionsRow.children.length > 0) {
      panel.appendChild(actionsRow);
      panel.appendChild(createEl('p', {
        className: 'muted',
        text: '아직 지원하지 않는 조치입니다. 조치 실행 연결은 준비 중이며, 이 버튼을 눌러도 요청을 보내지 않습니다.',
      }));
    }
  }

  return panel;
}

const SECRET_REDACT_PATTERN = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|token|secret|password|비밀번호|토큰)\s*[:=]\s*\S+)/gi;

function sanitizeSafeText(value, fallback = '확인 불가') {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  return value.replace(SECRET_REDACT_PATTERN, '[보호됨]');
}

function isTimeoutError(resource) {
  const code = String(resource?.error?.code || '').toUpperCase();
  const msg = String(resource?.error?.message || '');
  return code.includes('TIMEOUT') || msg.includes('시간이 초과') || msg.includes('시간 초과');
}

function formatRetryErrorText(targetLabel, resource) {
  const rawMsg = sanitizeSafeText(resource?.error?.message, '서버 응답을 확인할 수 없습니다.');
  const timeoutHint = isTimeoutError(resource) ? ' (요청 시간 초과)' : '';
  return `${targetLabel}을(를) 불러오지 못했습니다${timeoutHint}: ${rawMsg}`;
}

const RESOURCE_NAME_MAP = Object.freeze({
  me: '로그인 정보',
  devices: '기기 목록',
  sessions: '현재 세션',
  events: '보안 기록',
  access: '업무 앱 판정',
  diagnostics: '도움정보',
});

const AI_ERROR_GUIDES = Object.freeze({
  ON_AI_PROVISIONING_PENDING: {
    category: '권한 준비 중·확인 불가',
    guidance: '운영 측 계정 연결 및 앱 권한 준비가 진행 중입니다. 학생 코드 문제가 아니므로 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.',
  },
  ON_AI_AUTHORIZATION_CHANGED: {
    category: '권한 변경됨·확인 불가',
    guidance: '점검 도중 AI 이용 권한이 변경됐습니다. 담당자에게 현재 권한을 확인한 뒤 직접 다시 점검하세요.',
  },
  WB_CLCO_AUTH_REQUIRED: {
    category: '인증 실패',
    guidance: '계정 연결 인증을 다시 확인하세요. Workbench 열쇠나 토큰을 복사해 입력하지 마세요.',
  },
  WB_CLCO_ACCESS_BLOCKED: {
    category: '접근 제한',
    guidance: '학생 앱 AI 이용이 제한됐습니다. 담당자에게 운영 상태와 이용 권한을 확인하세요.',
  },
  SUBJECT_SCOPE_UNVERIFIED: {
    category: '인증·대상 범위 확인 불가',
    guidance: '현재 로그인과 프로젝트 연결을 확인할 수 없습니다. 계정 연결을 다시 확인하거나 담당자에게 문의하세요.',
  },
  WB_CLCO_COHORT_BUDGET_EXHAUSTED: {
    category: '사용량 소진',
    guidance: '반의 AI 사용량이 모두 소진됐습니다. 담당자에게 확인을 요청하세요.',
  },
  WB_CLCO_LIMIT_REACHED: {
    category: '이용 한도 도달',
    guidance: 'AI 이용 한도에 도달했습니다. 담당자에게 확인을 요청하세요.',
  },
  WB_CLCO_SESSION_CLOSED: {
    category: '이용 시간 아님',
    guidance: '현재 AI 이용 시간이 아닙니다. 안내된 이용 시간을 확인한 뒤 다시 시도하세요.',
  },
  WB_CLCO_RATE_LIMITED: {
    category: '요청 제한',
    guidance: '잠시 요청이 제한됐습니다. 잠시 뒤 위쪽 점검 버튼을 직접 눌러 다시 시도하세요.',
  },
  WB_CLCO_TIMEOUT: {
    category: '시간 초과',
    guidance: 'AI 응답 시간이 초과됐습니다. 자동 재시도하지 않으므로 필요할 때 직접 다시 점검하세요.',
  },
  REQUEST_TIMEOUT: {
    category: '시간 초과',
    guidance: '서버 AI 응답 시간이 초과됐습니다. 자동 재시도하지 않으므로 필요할 때 직접 다시 점검하세요.',
  },
  ENGINE_TIMEOUT: {
    category: '시간 초과',
    guidance: '서버 확인 시간이 초과됐습니다. 자동 재시도하지 않으므로 필요할 때 직접 다시 점검하세요.',
  },
  TIMEOUT: {
    category: '시간 초과',
    guidance: 'AI 응답 시간이 초과됐습니다. 자동 재시도하지 않으므로 필요할 때 직접 다시 점검하세요.',
  },
  NETWORK_ERROR: {
    category: '네트워크 오류',
    guidance: '로컬 서버 또는 네트워크 연결을 확인한 뒤 직접 다시 점검하세요.',
  },
  WB_CLCO_CANCELLED: {
    category: '점검 취소됨',
    guidance: '요청을 취소했습니다. 이전 응답·모델 수·성공 안내는 현재 결과가 아니므로 필요하면 직접 다시 점검하세요.',
  },
  CANCELLED: {
    category: '점검 취소됨',
    guidance: '요청을 취소했습니다. 이전 응답·모델 수·성공 안내는 현재 결과가 아니므로 필요하면 직접 다시 점검하세요.',
  },
  REQUEST_CANCELLED: {
    category: '점검 취소됨',
    guidance: '요청을 취소했습니다. 이전 응답·모델 수·성공 안내는 현재 결과가 아니므로 필요하면 직접 다시 점검하세요.',
  },
  ON_AI_MODEL_LIST_EMPTY: {
    category: '사용 가능한 모델 없음',
    guidance: '현재 앱 권한으로 쓸 수 있는 모델이 없습니다. 담당자에게 모델 허용 설정 확인을 요청하세요.',
  },
  MODEL_NOT_CONFIGURED: {
    category: '모델 미설정',
    guidance: '서버에 사용할 AI 모델이 설정되지 않았습니다. 담당자에게 모델 설정 확인을 요청하세요.',
  },
  ON_AI_INVALID_INPUT: {
    category: '입력 근거 확인 불가',
    guidance: '설명에 필요한 사건 근거와 규칙을 확인할 수 없습니다. 기존 기록은 그대로 유지됩니다.',
  },
  ON_AI_INVALID_OUTPUT: {
    category: '응답 형식 확인 불가',
    guidance: 'AI 설명 응답 형식이나 근거 ID가 현재 기록과 맞지 않습니다. 기존 기록은 그대로 유지됩니다.',
  },
  AI_REQUEST_UNVERIFIED: {
    category: '확인 불가',
    guidance: 'AI 연결 또는 응답을 확인할 수 없습니다. 계정 연결 상태를 확인하거나 담당자에게 문의하세요.',
  },
});

function resolveAiErrorGuide(error) {
  const rawCode = typeof error?.code === 'string' && error.code.trim().length > 0
    ? sanitizeSafeText(error.code.trim(), 'AI_REQUEST_UNVERIFIED')
    : 'AI_REQUEST_UNVERIFIED';
  if (Object.hasOwn(AI_ERROR_GUIDES, rawCode)) {
    return { code: rawCode, ...AI_ERROR_GUIDES[rawCode] };
  }
  if (rawCode.includes('TIMEOUT')) {
    return { code: rawCode, ...AI_ERROR_GUIDES.TIMEOUT };
  }
  if (rawCode.includes('CANCEL')) {
    return { code: rawCode, ...AI_ERROR_GUIDES.CANCELLED };
  }
  return { code: rawCode, ...AI_ERROR_GUIDES.AI_REQUEST_UNVERIFIED };
}

function pickSafeDiagnostics(data) {
  if (!data || typeof data !== 'object') return null;
  return {
    requestId: sanitizeSafeText(data.requestId, '없음'),
    component: sanitizeSafeText(data.component, '없음'),
    version: sanitizeSafeText(data.version, '없음'),
    checkedAt: typeof data.checkedAt === 'string' && data.checkedAt.trim().length > 0 ? data.checkedAt : '확인 불가',
    engine: {
      mode: sanitizeSafeText(data?.engine?.mode, '확인 불가'),
      code: sanitizeSafeText(data?.engine?.code, '확인 불가'),
    },
  };
}

export function createStudentView() {
  return {
    renderIdentity(input) {
      const { me, devices, sessions } = input && typeof input === 'object' ? input : {};
      const container = createEl('div', {
        attrs: { 'data-student-identity': 'rendered' },
      });

      container.appendChild(renderResourceBlock('로그인 사용자 · 현재 기기 · 세션', me, 'me', renderMeContent));
      container.appendChild(renderResourceBlock('등록 기기 목록', devices, 'devices', renderDevicesContent));
      container.appendChild(renderResourceBlock('활성·이전 세션 목록', sessions, 'sessions', renderSessionsContent));

      return container;
    },
    renderDecision(input) {
      const payload = input && typeof input === 'object' ? input : {};
      const status = payload.status || 'unknown';
      const mode = normalizeMode(payload.mode);
      const targetAppId = typeof payload.appId === 'string' && payload.appId.trim().length > 0 ? payload.appId : null;

      const container = createEl('div', {
        attrs: {
          'data-student-decision': 'rendered',
          'data-student-status': status,
          'data-student-mode': mode,
        },
      });

      const header = createEl('div', { className: 'row' }, [
        createEl('h3', { text: '업무 앱 접속 판정' }),
        createModeBadge(mode),
      ]);
      container.appendChild(header);

      if (status === 'idle') {
        container.appendChild(createEl('p', {
          className: 'state state-empty',
          text: `앱을 골라 접속을 요청하세요. (${MODE_LABELS[mode]})`,
        }));
        return container;
      }

      if (status === 'loading') {
        const prefix = targetAppId ? `${targetAppId} ` : '';
        container.appendChild(createEl('p', {
          className: 'state state-loading',
          text: `${prefix}판정 확인 중 (${MODE_LABELS[mode]})`,
          attrs: { role: 'status' },
        }));
        return container;
      }

      if (status === 'error') {
        const message = typeof payload?.error?.message === 'string' && payload.error.message.trim().length > 0
          ? payload.error.message
          : '서버 응답을 확인할 수 없습니다.';
        container.appendChild(createEl('p', {
          className: 'decision decision-failed',
          text: `요청 실패: ${message} · ${MODE_LABELS[mode]}`,
          attrs: { role: 'alert', 'data-student-decision-state': 'error' },
        }));
        container.appendChild(createEl('p', {
          className: 'muted',
          text: '요청 실패는 접근 거부(deny)나 허용(allow) 판정이 아닙니다.',
        }));
        return container;
      }

      if (status !== 'ok' || !payload.data || typeof payload.data !== 'object') {
        container.appendChild(createEl('p', {
          className: 'decision decision-unknown',
          text: `판정 확인 불가 (unknown) · 허용됨(allow)이 아닙니다. (${MODE_LABELS[mode]})`,
          attrs: { 'data-student-decision-state': 'unknown' },
        }));
        return container;
      }

      const data = payload.data;
      const decisionKey = typeof data.decision === 'string' && Object.hasOwn(DECISION_MAP, data.decision)
        ? data.decision
        : 'unknown';
      const info = DECISION_MAP[decisionKey];
      const appIdText = typeof data.appId === 'string' && data.appId.trim().length > 0
        ? data.appId
        : (targetAppId || '확인 불가');
      const reasonText = typeof data.reason === 'string' && data.reason.trim().length > 0
        ? data.reason
        : '판정 이유 정보 없음';

      container.appendChild(createEl('p', {
        className: info.className,
        text: `${info.label} (${decisionKey})`,
        attrs: { 'data-student-decision-state': decisionKey },
      }));
      container.appendChild(createEl('p', { className: 'muted', text: info.note }));

      const details = createEl('dl', { className: 'kv' });
      details.appendChild(createEl('dt', { text: '업무 앱' }));
      details.appendChild(createEl('dd', { text: appIdText }));
      details.appendChild(createEl('dt', { text: '판정 이유' }));
      details.appendChild(createEl('dd', { text: reasonText }));
      details.appendChild(createEl('dt', { text: '판정 시각' }));
      details.appendChild(createEl('dd', { text: formatCheckedAt(data.checkedAt) }));
      container.appendChild(details);

      return container;
    },
    renderEvents(input) {
      const payload = input && typeof input === 'object' ? input : {};
      const status = payload.status || 'unknown';
      const mode = normalizeMode(payload.mode);

      const container = createEl('div', {
        attrs: {
          'data-student-events': 'rendered',
          'data-student-status': status,
          'data-student-mode': mode,
        },
      });

      container.appendChild(createEl('div', { className: 'row' }, [
        createEl('h3', { text: '접속 기록 · XDR 경보' }),
        createModeBadge(mode),
      ]));

      if (status === 'loading') {
        resetEventsViewState();
        container.appendChild(createEl('p', {
          className: 'state state-loading',
          text: `불러오는 중 (${MODE_LABELS[mode]})`,
          attrs: { role: 'status' },
        }));
        return container;
      }

      if (status === 'error') {
        resetEventsViewState();
        const code = payload?.error?.code;
        const message = typeof payload?.error?.message === 'string' && payload.error.message.trim().length > 0
          ? payload.error.message
          : '서버 응답을 확인할 수 없습니다.';
        const prefix = code === 'CONTRACT_MISMATCH' || code === 'ENGINE_RESULT_UNVERIFIED'
          ? '확인 불가'
          : '기록을 불러오지 못했습니다';
        container.appendChild(createEl('p', {
          className: 'state state-error',
          text: `${prefix}: ${message} · ${MODE_LABELS[mode]}`,
          attrs: { role: 'alert', 'data-student-events-state': 'error' },
        }));
        return container;
      }

      if (status !== 'ok' || !Array.isArray(payload.data)) {
        resetEventsViewState();
        container.appendChild(createEl('p', {
          className: 'state state-empty',
          text: `확인 불가: 기록 목록 형식이 올바르지 않습니다. (${MODE_LABELS[mode]})`,
          attrs: { 'data-student-events-state': 'unverifiable' },
        }));
        return container;
      }

      if (payload.data.length === 0) {
        resetEventsViewState();
        container.appendChild(createEl('p', {
          className: 'state state-empty',
          text: `표시할 기록이 없습니다. (${MODE_LABELS[mode]})`,
          attrs: { 'data-student-events-state': 'empty' },
        }));
        return container;
      }

      const signature = JSON.stringify(payload.data);
      if (eventsViewState.lastDataSignature !== signature) {
        eventsViewState.lastDataSignature = signature;
        eventsViewState.filters = { kind: 'all', appId: 'all', access: 'all' };
        eventsViewState.selectedEventId = null;
      }

      const sorted = sortEventsLatestFirst(payload.data);
      const kindValues = [...new Set(['access', 'xdr', ...sorted.map((e) => e?.kind).filter((v) => typeof v === 'string' && v.length > 0)])];
      const appValues = [...new Set(sorted.map((e) => e?.appId).filter((v) => typeof v === 'string' && v.length > 0))];
      const accessValues = [...new Set(['allowed', 'denied', 'unknown', ...sorted.map((e) => e?.state?.access).filter((v) => typeof v === 'string' && v.length > 0)])];

      const countSummary = createEl('p', { className: 'muted' });
      const listRegion = createEl('div');
      const detailRegion = createEl('div');

      const renderFiltered = () => {
        const { kind, appId, access } = eventsViewState.filters;
        const filtered = sorted.filter((ev) => {
          if (kind !== 'all' && ev?.kind !== kind) return false;
          if (appId !== 'all' && ev?.appId !== appId) return false;
          if (access !== 'all' && ev?.state?.access !== access) return false;
          return true;
        });

        countSummary.textContent = `표시 건수: ${filtered.length}건 / 전체 ${sorted.length}건 (최근 최대 40건 범위)`;

        listRegion.textContent = '';
        if (filtered.length === 0) {
          listRegion.appendChild(createEl('p', {
            className: 'state state-empty',
            text: '선택한 필터 조건에 맞는 기록이 없습니다.',
          }));
        } else {
          const ul = createEl('ul', { className: 'records' });
          for (const ev of filtered) {
            const eventId = typeof ev?.id === 'string' && ev.id.length > 0 ? ev.id : 'unknown';
            const detailBtn = createEl('button', {
              type: 'button',
              className: 'btn',
              text: `${eventId} 상세`,
              attrs: { 'aria-expanded': eventsViewState.selectedEventId === eventId ? 'true' : 'false' },
            });
            detailBtn.addEventListener('click', () => {
              eventsViewState.selectedEventId = eventsViewState.selectedEventId === eventId ? null : eventId;
              renderFiltered();
            });

            const li = createEl('li', {
              className: 'event',
              attrs: { 'data-student-event-id': eventId },
            }, [
              createEl('div', { className: 'event-head' }, [
                createEl('h4', { text: ev?.summary || '요약 없음' }),
                createEl('span', { className: 'tag', text: getKindLabel(ev?.kind) }),
              ]),
              createEl('p', {
                className: 'muted',
                text: `사건 ID: ${eventId} · 시각: ${formatCheckedAt(ev?.at)} · 앱: ${formatAppIdText(ev?.appId)}`,
              }),
              createEl('div', { className: 'event-actions' }, [detailBtn]),
            ]);
            ul.appendChild(li);
          }
          listRegion.appendChild(ul);
        }

        detailRegion.textContent = '';
        if (eventsViewState.selectedEventId) {
          const selected = filtered.find((ev) => ev?.id === eventsViewState.selectedEventId);
          if (selected) {
            detailRegion.appendChild(renderEventDetailPanel(selected));
          }
        }
      };

      const filterBar = createEl('div', { className: 'row' }, [
        createFilterSelect('기록 종류', 'student-filter-kind', kindValues, eventsViewState.filters.kind, getKindLabel, (val) => {
          eventsViewState.filters.kind = val;
          renderFiltered();
        }),
        createFilterSelect('업무 앱', 'student-filter-app', appValues, eventsViewState.filters.appId, (v) => v, (val) => {
          eventsViewState.filters.appId = val;
          renderFiltered();
        }),
        createFilterSelect('접속 상태', 'student-filter-access', accessValues, eventsViewState.filters.access, (v) => {
          return Object.hasOwn(ACCESS_STATE_MAP, v) ? `${ACCESS_STATE_MAP[v].label} (${v})` : `확인 불가 (${v})`;
        }, (val) => {
          eventsViewState.filters.access = val;
          renderFiltered();
        }),
      ]);

      container.appendChild(filterBar);
      container.appendChild(countSummary);
      container.appendChild(listRegion);
      container.appendChild(detailRegion);

      renderFiltered();
      return container;
    },
    renderStatus(input) {
      const payload = input && typeof input === 'object' ? input : {};
      const mode = normalizeMode(payload.mode);
      const container = createEl('div', {
        attrs: {
          'data-student-status-view': 'rendered',
          'data-student-mode': mode,
        },
      });

      container.appendChild(createEl('div', { className: 'row' }, [
        createEl('h3', { text: '기기 · 세션 · 알림 · 도움정보 상태' }),
        createModeBadge(mode),
      ]));

      // 1. 기기 상태 섹션
      const devicesRes = payload.devices && typeof payload.devices === 'object' ? payload.devices : { status: 'error', mode: 'unknown' };
      const devicesSec = createEl('section', {
        className: 'card',
        attrs: { 'data-student-status-section': 'devices', 'data-student-status': devicesRes.status || 'unknown' },
      }, [createEl('h4', { text: '등록 기기 상태' })]);

      if (devicesRes.status === 'loading') {
        devicesSec.appendChild(createEl('p', { className: 'state state-loading', text: '기기 목록을 불러오는 중입니다.', attrs: { role: 'status' } }));
      } else if (devicesRes.status === 'error') {
        devicesSec.appendChild(createEl('p', { className: 'state state-error', text: formatRetryErrorText('기기 목록', devicesRes), attrs: { role: 'alert' } }));
        devicesSec.appendChild(createEl('p', { className: 'muted', text: "다시 시도는 위쪽 '다시 불러오기' 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다." }));
      } else if (devicesRes.status !== 'ok' || !Array.isArray(devicesRes.data)) {
        devicesSec.appendChild(createEl('p', { className: 'state state-empty', text: '기기 목록 상태를 확인할 수 없습니다.' }));
      } else if (devicesRes.data.length === 0) {
        devicesSec.appendChild(createEl('p', { className: 'state state-empty', text: '등록된 기기가 없습니다.' }));
      } else {
        const ul = createEl('ul', { className: 'plain-list' });
        for (const d of devicesRes.data) {
          ul.appendChild(createEl('li', {}, [
            createEl('span', { className: 'item-title', text: formatNameAndId(d?.label, d?.id) }),
            createStatusBadge(DEVICE_STATUS_MAP, d?.status, 'device'),
          ]));
        }
        devicesSec.appendChild(ul);
      }
      container.appendChild(devicesSec);

      // 2. 현재 세션 상태 섹션 (검증된 연결 1건만 대상)
      const sessionsRes = payload.sessions && typeof payload.sessions === 'object' ? payload.sessions : { status: 'error', mode: 'unknown' };
      const sessionsSec = createEl('section', {
        className: 'card',
        attrs: { 'data-student-status-section': 'sessions', 'data-student-status': sessionsRes.status || 'unknown' },
      }, [
        createEl('h4', { text: '현재 세션 연결 상태' }),
        createEl('p', { className: 'muted', text: '세션 조회는 현재 검증된 연결 1건만 대상으로 하며, 과거 세션 전체 목록이 아닙니다.' }),
      ]);

      if (sessionsRes.status === 'loading') {
        sessionsSec.appendChild(createEl('p', { className: 'state state-loading', text: '현재 세션 연결 상태를 불러오는 중입니다.', attrs: { role: 'status' } }));
      } else if (sessionsRes.status === 'error') {
        sessionsSec.appendChild(createEl('p', { className: 'state state-error', text: formatRetryErrorText('현재 세션', sessionsRes), attrs: { role: 'alert' } }));
        sessionsSec.appendChild(createEl('p', { className: 'muted', text: "다시 시도는 위쪽 '다시 불러오기' 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다." }));
      } else if (sessionsRes.status !== 'ok' || !Array.isArray(sessionsRes.data)) {
        sessionsSec.appendChild(createEl('p', { className: 'state state-empty', text: '현재 세션 상태를 확인할 수 없습니다.' }));
      } else if (sessionsRes.data.length === 0) {
        sessionsSec.appendChild(createEl('p', { className: 'state state-empty', text: '현재 연결 없음 (표시할 검증된 세션이 없습니다).' }));
      } else {
        const ul = createEl('ul', { className: 'plain-list' });
        for (const s of sessionsRes.data) {
          const idText = typeof s?.id === 'string' && s.id.trim().length > 0 ? s.id : '확인 불가';
          ul.appendChild(createEl('li', {}, [
            createEl('span', { className: 'item-title', text: idText }),
            createStatusBadge(SESSION_STATUS_MAP, s?.status, 'session'),
          ]));
        }
        sessionsSec.appendChild(ul);
      }
      container.appendChild(sessionsSec);

      // 3. 알림 섹션
      const notifications = Array.isArray(payload.notifications) ? payload.notifications : [];
      const notifSec = createEl('section', {
        className: 'card',
        attrs: { 'data-student-status-section': 'notifications' },
      }, [createEl('h4', { text: '주의 알림' })]);

      if (notifications.length === 0) {
        notifSec.appendChild(createEl('p', { className: 'state state-empty', text: '주의할 알림이 없습니다.' }));
      } else {
        const ul = createEl('ul', { className: 'plain-list' });
        for (const n of notifications) {
          const resKey = typeof n?.resource === 'string' && n.resource.trim().length > 0 ? n.resource : 'unknown';
          const resLabel = Object.hasOwn(RESOURCE_NAME_MAP, resKey) ? `${RESOURCE_NAME_MAP[resKey]} (${resKey})` : resKey;
          const safeCode = sanitizeSafeText(n?.code, 'UNVERIFIED');
          const safeMsg = sanitizeSafeText(n?.message, '상세 내용 없음');
          ul.appendChild(createEl('li', {}, [
            createEl('span', { className: 'item-title', text: `[${resLabel}] ${safeCode}` }),
            createEl('span', { className: 'muted', text: safeMsg }),
          ]));
        }
        notifSec.appendChild(ul);
      }
      container.appendChild(notifSec);

      // 4. 도움정보 (전달받은 diagnostics만 표시, 직접 호출 금지)
      const diagRes = payload.diagnostics && typeof payload.diagnostics === 'object' ? payload.diagnostics : { status: 'idle', mode: 'unknown' };
      const diagSec = createEl('section', {
        className: 'card',
        attrs: { 'data-student-status-section': 'diagnostics', 'data-student-status': diagRes.status || 'unknown' },
      }, [
        createEl('h4', { text: '도움정보 요약 (비밀정보 제외)' }),
        createEl('p', { className: 'muted', text: '도움 요청 시 전달할 수 있도록 비밀번호·토큰·API 키를 제외한 안전한 진단 값만 표시하고, 버튼을 누를 때만 복사합니다.' }),
      ]);

      const safeDiag = diagRes.status === 'ok' ? pickSafeDiagnostics(diagRes.data) : null;

      if (diagRes.status === 'idle') {
        diagSec.appendChild(createEl('p', { className: 'state state-empty', text: "도움정보가 아직 조회되지 않았습니다. 위쪽 도움정보 카드에서 '도움정보 불러오기'를 누르면 반영됩니다." }));
      } else if (diagRes.status === 'loading') {
        diagSec.appendChild(createEl('p', { className: 'state state-loading', text: '도움정보를 불러오는 중입니다.', attrs: { role: 'status' } }));
      } else if (diagRes.status === 'error') {
        diagSec.appendChild(createEl('p', { className: 'state state-error', text: formatRetryErrorText('도움정보', diagRes), attrs: { role: 'alert' } }));
        diagSec.appendChild(createEl('p', { className: 'muted', text: "다시 시도는 도움정보 카드의 '도움정보 불러오기' 또는 위쪽 '다시 불러오기' 버튼을 직접 누르세요." }));
      } else if (!safeDiag) {
        diagSec.appendChild(createEl('p', { className: 'state state-empty', text: '도움정보 형식을 확인할 수 없습니다.' }));
      } else {
        const kv = createEl('dl', { className: 'kv' });
        const entries = [
          ['요청 ID (requestId)', safeDiag.requestId],
          ['구성요소 (component)', safeDiag.component],
          ['버전 (version)', safeDiag.version],
          ['확인 시각 (checkedAt)', formatCheckedAt(safeDiag.checkedAt)],
          ['엔진 모드 (engine.mode)', safeDiag.engine.mode],
          ['엔진 코드 (engine.code)', safeDiag.engine.code],
        ];
        for (const [k, v] of entries) {
          kv.appendChild(createEl('dt', { text: k }));
          kv.appendChild(createEl('dd', { text: v }));
        }
        diagSec.appendChild(kv);
      }

      const copyStatus = createEl('p', { className: 'muted', attrs: { role: 'status', 'aria-live': 'polite' } });
      const copyBtn = createEl('button', {
        type: 'button',
        className: 'btn',
        text: '도움정보 복사',
      });
      copyBtn.addEventListener('click', async () => {
        if (!safeDiag) {
          copyStatus.textContent = "복사할 도움정보가 없습니다. 먼저 위쪽에서 '도움정보 불러오기'를 실행하세요.";
          return;
        }
        const safeText = JSON.stringify(safeDiag, null, 2);
        try {
          if (!navigator?.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
          await navigator.clipboard.writeText(safeText);
          copyStatus.textContent = '도움 요청에 사용할 안전한 도움정보를 복사했습니다.';
        } catch {
          copyStatus.textContent = '클립보드 복사를 사용할 수 없습니다. 화면에 표시된 안전 항목을 직접 확인하세요.';
        }
      });

      diagSec.appendChild(createEl('div', { className: 'row' }, [copyBtn]));
      diagSec.appendChild(copyStatus);
      container.appendChild(diagSec);

      return container;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection(input) {
      const payload = input && typeof input === 'object' ? input : {};
      const status = typeof payload.status === 'string' && payload.status.trim().length > 0
        ? payload.status.trim()
        : 'idle';
      const mode = normalizeMode(payload.mode);

      const container = createEl('div', {
        attrs: {
          'data-student-ai-connection': 'rendered',
          'data-student-status': status,
          'data-student-mode': mode,
        },
      });

      container.appendChild(createEl('div', { className: 'row' }, [
        createEl('h3', { text: 'AI 연결 상태 (수업용 게이트)' }),
        createModeBadge(mode),
      ]));

      if (status === 'idle') {
        container.appendChild(createEl('p', {
          className: 'state state-empty',
          text: 'AI 연결 점검 전입니다. 위쪽 점검 버튼을 눌러 모델 응답을 확인하세요.',
        }));
        container.appendChild(createEl('p', {
          className: 'muted',
          text: '계정 연결이나 설정값 존재만으로는 앱 이용 권한이나 사건 설명 성공이 확인되지 않습니다.',
        }));
        return container;
      }

      if (status === 'loading') {
        container.appendChild(createEl('p', {
          className: 'state state-loading',
          text: 'AI 연결 점검 중입니다. 현재 로그인과 앱 권한으로 모델 응답을 확인하고 있습니다.',
          attrs: { role: 'status' },
        }));
        container.appendChild(createEl('p', {
          className: 'muted',
          text: '점검이 길어지면 취소 버튼으로 중단할 수 있으며, 자동으로 재시도하지 않습니다.',
        }));
        return container;
      }

      if (status === 'error') {
        const guide = resolveAiErrorGuide(payload.error);
        const safeMessage = sanitizeSafeText(payload?.error?.message, 'AI 연결 또는 응답을 확인할 수 없습니다.');
        container.appendChild(createEl('p', {
          className: 'state state-error',
          text: `[${guide.category}] (${guide.code}) ${safeMessage}`,
          attrs: { role: 'alert', 'data-student-ai-error-code': guide.code },
        }));
        container.appendChild(createEl('p', {
          className: 'muted',
          text: guide.guidance,
        }));
        container.appendChild(createEl('p', {
          className: 'muted',
          text: '자동으로 다시 점검하지 않습니다. 다시 점검하려면 위쪽 점검 버튼을 직접 누르세요.',
        }));
        return container;
      }

      const data = payload.data && typeof payload.data === 'object' ? payload.data : null;
      const authKind = data?.audienceAuthorization;
      if (status !== 'ok' || !data || (authKind !== 'test' && authKind !== 'verified')) {
        container.appendChild(createEl('p', {
          className: 'state state-error',
          text: 'AI 연결 점검 결과를 확인할 수 없습니다. 계정 연결 상태를 확인한 뒤 직접 다시 점검하세요.',
          attrs: { role: 'alert' },
        }));
        return container;
      }

      const authText = authKind === 'test'
        ? '시험 연결 점검(test) · 실제 앱 권한 승인이 아닌 연결 테스트 응답입니다.'
        : '앱 권한 확인 후 점검(verified)';
      const modelCountText = Number.isInteger(data.modelCount) && data.modelCount >= 0
        ? String(data.modelCount)
        : '확인 불가';

      container.appendChild(createEl('p', {
        className: authKind === 'verified' ? 'state state-ok' : 'state state-empty',
        text: authText,
        attrs: { 'data-student-ai-auth': authKind },
      }));

      const kv = createEl('dl', { className: 'kv' }, [
        createEl('dt', { text: '점검 구분' }),
        createEl('dd', { text: authKind === 'test' ? '시험 연결 점검(test)' : '앱 권한 확인 후 점검(verified)' }),
        createEl('dt', { text: '응답 모델 수 (modelCount)' }),
        createEl('dd', { text: modelCountText }),
        createEl('dt', { text: '점검 시각 (checkedAt)' }),
        createEl('dd', { text: formatCheckedAt(payload.checkedAt) }),
      ]);
      container.appendChild(kv);

      const explanationNotice = payload.explanationAccepted === true
        ? '사건 설명 실행이 확인됐습니다.'
        : '연결(모델 목록) 점검만 완료했으며, 사건 설명은 아직 실행하지 않았습니다. 실제 사건 설명은 보안 기록에서 별도로 요청하세요.';
      container.appendChild(createEl('p', {
        className: 'muted',
        text: explanationNotice,
        attrs: { 'data-student-ai-explanation-accepted': String(Boolean(payload.explanationAccepted)) },
      }));

      return container;
    },
    renderExplanation(input) {
      const payload = input && typeof input === 'object' ? input : {};
      const expl = payload.explanation && typeof payload.explanation === 'object'
        ? payload.explanation
        : { status: 'idle', mode: 'unknown' };
      const status = typeof expl.status === 'string' && expl.status.trim().length > 0
        ? expl.status.trim()
        : 'idle';
      const mode = normalizeMode(expl.mode);
      const event = payload.event && typeof payload.event === 'object' ? payload.event : null;
      const eventId = typeof event?.id === 'string' && event.id.trim().length > 0
        ? event.id.trim()
        : null;

      let validationError = null;
      let validatedData = null;

      if (status === 'ok') {
        const data = expl.data && typeof expl.data === 'object' ? expl.data : null;
        const summary = typeof data?.summary === 'string' && data.summary.trim().length > 0
          ? sanitizeSafeText(data.summary)
          : null;
        const evidenceRows = Array.isArray(event?.evidence) ? event.evidence : [];
        const evidenceMap = new Map();
        for (const row of evidenceRows) {
          if (row && typeof row.id === 'string' && row.id.trim().length > 0) {
            evidenceMap.set(row.id.trim(), sanitizeSafeText(row.text, '근거 내용 없음'));
          }
        }
        const rawEvidenceIds = Array.isArray(data?.evidenceIds) ? data.evidenceIds : [];
        const evidenceIds = rawEvidenceIds
          .filter((id) => typeof id === 'string' && id.trim().length > 0)
          .map((id) => id.trim());
        const supportedActions = Array.isArray(event?.supportedActions) ? event.supportedActions : [];
        const proposals = Array.isArray(data?.proposals) ? data.proposals : [];

        if (!event || !eventId) {
          validationError = { code: 'ON_AI_INVALID_INPUT', message: '보안 기록을 먼저 선택해야 설명을 확인할 수 있습니다.' };
        } else if (!data) {
          validationError = { code: 'ON_AI_INVALID_OUTPUT', message: 'AI 설명 응답 형식을 확인할 수 없습니다.' };
        } else if (data.executed === true) {
          validationError = { code: 'ON_AI_INVALID_OUTPUT', message: 'AI가 이미 실행했다고 답한 설명은 사용할 수 없습니다.' };
        } else if (!summary) {
          validationError = { code: 'ON_AI_INVALID_OUTPUT', message: 'AI 설명 요약이 비어 있어 사용할 수 없습니다.' };
        } else if (evidenceIds.length === 0 || evidenceIds.length !== rawEvidenceIds.length) {
          validationError = { code: 'ON_AI_INVALID_OUTPUT', message: '근거 ID가 부족하거나 형식이 올바르지 않아 설명을 사용할 수 없습니다 (근거 부족).' };
        } else if (evidenceIds.some((id) => !evidenceMap.has(id))) {
          validationError = { code: 'ON_AI_INVALID_OUTPUT', message: '설명에서 인용한 근거 ID가 현재 사건의 근거에 없어 사용할 수 없습니다 (근거가 맞지 않음).' };
        } else {
          const invalidProposal = proposals.some((p) => {
            if (!p || typeof p !== 'object' || typeof p.action !== 'string' || !supportedActions.includes(p.action)) return true;
            if (Array.isArray(p.evidenceIds)) {
              if (p.evidenceIds.length === 0 || p.evidenceIds.some((id) => typeof id !== 'string' || !evidenceMap.has(id.trim()))) return true;
            }
            return false;
          });
          if (invalidProposal) {
            validationError = { code: 'ON_AI_INVALID_OUTPUT', message: '제안된 조치 또는 근거 ID가 현재 사건과 맞지 않아 설명을 사용할 수 없습니다.' };
          } else {
            validatedData = { summary, evidenceIds, evidenceMap, proposals, supportedActions };
          }
        }
      }

      const isValidOk = status === 'ok' && validationError === null && validatedData !== null;
      const containerAttrs = {
        'data-student-explanation': 'rendered',
        'data-student-status': isValidOk ? 'ok' : (status === 'ok' ? 'error' : status),
        'data-student-mode': mode,
      };
      if (isValidOk) {
        containerAttrs['data-student-explanation-event'] = eventId;
      }

      const container = createEl('div', { attrs: containerAttrs });
      container.appendChild(createEl('div', { className: 'row' }, [
        createEl('h3', { text: 'AI 설명 (참고용)' }),
        createModeBadge(mode),
      ]));

      if (status === 'error') {
        const guide = resolveAiErrorGuide(expl.error);
        const safeMessage = sanitizeSafeText(expl?.error?.message, 'AI 설명을 불러오지 못했습니다.');
        container.appendChild(createEl('p', {
          className: 'state state-error',
          text: `AI 설명 실패 [${guide.category}] (${guide.code}): ${safeMessage}`,
          attrs: { role: 'alert' },
        }));
        container.appendChild(createEl('p', {
          className: 'muted',
          text: `${guide.guidance} 기록은 그대로입니다. AI 연결·응답 실패나 취소는 과제 실패가 아니며 사건 판정을 바꾸지 않습니다.`,
        }));
        return container;
      }

      if (status === 'loading') {
        container.appendChild(createEl('p', {
          className: 'state state-loading',
          text: '설명 요청 중입니다. AI가 선택한 사건의 근거와 규칙을 읽고 있습니다.',
          attrs: { role: 'status' },
        }));
        container.appendChild(createEl('p', {
          className: 'muted',
          text: '필요하면 취소할 수 있으며, 다른 기록을 고르면 이전 응답은 반영되지 않습니다. 기존 보안 기록은 변경되지 않습니다.',
        }));
        return container;
      }

      if (!event || !eventId) {
        container.appendChild(createEl('p', {
          className: 'state state-empty',
          text: '보안 기록에서 기록을 먼저 고르세요. 선택한 기록의 근거·규칙·상태에 맞춘 AI 설명만 표시됩니다.',
        }));
        return container;
      }

      if (status === 'idle') {
        container.appendChild(createEl('p', {
          className: 'state state-empty',
          text: `선택한 사건(${eventId})의 설명 대기 중입니다. 보안 기록 목록에서 'AI 설명' 버튼을 눌러 요청하세요.`,
        }));
        return container;
      }

      if (!isValidOk) {
        const errInfo = validationError || { code: 'ON_AI_INVALID_OUTPUT', message: 'AI 설명을 확인할 수 없습니다.' };
        container.appendChild(createEl('p', {
          className: 'state state-error',
          text: `AI 설명 실패 (${errInfo.code}): ${errInfo.message}`,
          attrs: { role: 'alert' },
        }));
        container.appendChild(createEl('p', {
          className: 'muted',
          text: '근거가 맞지 않는 설명은 표시하거나 지어내지 않습니다. 기록은 그대로입니다.',
        }));
        return container;
      }

      container.appendChild(createEl('dl', { className: 'kv' }, [
        createEl('dt', { text: '사건 ID' }),
        createEl('dd', { text: eventId }),
        createEl('dt', { text: '확인 시각' }),
        createEl('dd', { text: formatCheckedAt(payload.checkedAt) }),
      ]));

      container.appendChild(createEl('p', { text: validatedData.summary }));
      container.appendChild(createEl('p', {
        className: 'muted',
        text: '아래 요약은 AI가 이 기록을 읽고 쓴 참고용 해석입니다. 사실 판단은 인용한 근거 글과 연동 시스템이 알려 준 현재 상태를 기준으로 합니다.',
      }));

      // 인용한 근거 ID — 근거 글
      container.appendChild(createEl('h4', { text: '인용한 근거' }));
      const evUl = createEl('ul', { className: 'plain-list' });
      for (const refId of validatedData.evidenceIds) {
        evUl.appendChild(createEl('li', {
          text: `${refId} — ${validatedData.evidenceMap.get(refId)}`,
        }));
      }
      container.appendChild(evUl);

      // 현재 규칙 ID — 규칙 글
      container.appendChild(createEl('h4', { text: '적용 규칙' }));
      const rules = Array.isArray(event.rules) ? event.rules : [];
      if (rules.length === 0) {
        container.appendChild(createEl('p', { className: 'muted', text: '적용된 규칙이 없습니다.' }));
      } else {
        const rulesUl = createEl('ul', { className: 'plain-list' });
        for (const rule of rules) {
          const rId = sanitizeSafeText(rule?.id, '규칙');
          const rText = sanitizeSafeText(rule?.text, '내용 없음');
          rulesUl.appendChild(createEl('li', { text: `${rId} — ${rText}` }));
        }
        container.appendChild(rulesUl);
      }

      // 확인되지 않은 현재 상태 (unknown)
      container.appendChild(createEl('h4', { text: '확인되지 않은 현재 상태' }));
      const stateLabels = [
        ['access', '접속'],
        ['session', '세션'],
        ['device', '기기'],
      ];
      const unknownEntries = stateLabels.filter(([key]) => event?.state?.[key] === 'unknown');
      if (unknownEntries.length === 0) {
        container.appendChild(createEl('p', { className: 'muted', text: '없음 (모든 상태가 확인됨)' }));
      } else {
        const unknownUl = createEl('ul', { className: 'plain-list' });
        for (const [, label] of unknownEntries) {
          unknownUl.appendChild(createEl('li', {
            text: `${label}: 확인 불가(unknown)`,
          }));
        }
        container.appendChild(unknownUl);
      }

      // 조치 제안 (실행 버튼 생성 금지)
      container.appendChild(createEl('h4', { text: '조치 제안' }));
      if (validatedData.proposals.length === 0) {
        const noProposalText = validatedData.supportedActions.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
          : 'AI가 이 기록에 맞는 조치를 제안하지 않았습니다.';
        container.appendChild(createEl('p', { className: 'muted', text: noProposalText }));
      } else {
        const propUl = createEl('ul', { className: 'plain-list' });
        for (const p of validatedData.proposals) {
          const actionText = sanitizeSafeText(p.action, '알 수 없는 조치');
          const reasonText = sanitizeSafeText(p.reason, '이유 없음');
          const refNote = Array.isArray(p.evidenceIds) && p.evidenceIds.length > 0
            ? ` (근거: ${p.evidenceIds.join(', ')})`
            : '';
          propUl.appendChild(createEl('li', {
            text: `${actionText} — ${reasonText}${refNote} · 사람 확인이 필요하며 아직 실행되지 않았습니다.`,
          }));
        }
        container.appendChild(propUl);
      }
      container.appendChild(createEl('p', {
        className: 'muted',
        text: 'AI는 조치를 자동 실행하지 않습니다.',
      }));

      return container;
    },
    renderAction(input) {
      const payload = input && typeof input === 'object' ? input : {};
      const rawStatus = typeof payload.status === 'string' && payload.status.trim().length > 0
        ? payload.status.trim()
        : 'idle';
      const event = payload.event && typeof payload.event === 'object' ? payload.event : null;
      const eventId = typeof event?.id === 'string' && event.id.trim().length > 0 ? event.id.trim() : null;
      const actionId = typeof payload.actionId === 'string' && payload.actionId.trim().length > 0
        ? payload.actionId.trim()
        : null;
      const target = payload.target && typeof payload.target === 'object' ? payload.target : null;
      const receipt = payload.receipt && typeof payload.receipt === 'object' ? payload.receipt : null;
      const observation = payload.observation && typeof payload.observation === 'object' ? payload.observation : null;

      const receiptEventMismatch = Boolean(
        receipt && typeof receipt.eventId === 'string' && eventId && receipt.eventId.trim() !== eventId,
      );
      const receiptActionMismatch = Boolean(
        receipt && typeof receipt.actionId === 'string' && actionId && receipt.actionId.trim() !== actionId,
      );
      const intentMismatch = receiptEventMismatch || receiptActionMismatch;

      let effectiveStatus = rawStatus;
      if (intentMismatch) {
        effectiveStatus = 'error';
      } else if (rawStatus === 'succeeded' && observation?.effectApplied !== true) {
        // 원천 관측(effectApplied === true) 없이는 절대 효과 확인(succeeded)으로 표시하지 않는다.
        effectiveStatus = 'unknown';
      }

      const ACTION_STATUS_MAP = {
        idle: {
          className: 'state state-empty',
          headline: '아직 미실행 (idle)',
          note: 'AI 설명의 조치 제안이나 준비만으로는 보안 조치가 실행되지 않습니다. 준비가 열리면 제공 화면의 버튼을 직접 사용하세요.',
        },
        loading: {
          className: 'state state-loading',
          headline: '조치 준비 또는 결과 조회 중 (loading) · 완료 아님',
          note: '서버에서 조치 준비 또는 연동 시스템 결과 조회를 진행하고 있습니다. 아직 완료나 효과 확인이 아닙니다.',
        },
        prepared: {
          className: 'state state-empty',
          headline: '준비됨 · 미실행 (prepared)',
          note: '아직 실행되지 않았습니다. 아래 실제 대상과 확인 기한을 읽은 뒤 제공 화면의 「대상과 조치를 확인했으며 집행합니다」 버튼을 직접 눌러야 전송됩니다.',
        },
        executing: {
          className: 'state state-loading',
          headline: '서버에 전달 중 (executing) · 완료 아님',
          note: '사람 확인 후 서버에 요청을 전달하는 중입니다. 결과가 아직 확인되지 않았으며 실행 성공이 아닙니다.',
        },
        pending: {
          className: 'state state-loading',
          headline: '서버 접수·처리 중 (pending) · 완료 아님',
          note: '서버가 요청을 접수(ACK)해 처리 중입니다. 접수 응답(ACK)은 실제 효과 확인이나 완료가 아닙니다.',
        },
        succeeded: {
          className: 'state state-ok',
          headline: '효과 확인 (succeeded)',
          note: '연동 시스템 관측에서 실제 효과 적용(effectApplied: true)이 확인됐습니다.',
        },
        denied: {
          className: 'state state-error',
          headline: '거절 (denied)',
          note: '연동 시스템 정책이 이 조치를 허용하지 않아 거절됐습니다.',
        },
        failed: {
          className: 'state state-error',
          headline: '실패 (failed)',
          note: '조치 처리에 실패했습니다. 원인과 기존 기록을 확인하세요.',
        },
        unknown: {
          className: 'state state-error',
          headline: '결과 불명 (unknown) · 효과 없음으로 판단 금지',
          note: '성공이나 효과 없음으로 단정하지 마세요. 이미 전달된 조치일 수 있으므로 제공 화면의 결과 재조회 버튼으로 결과만 다시 확인하세요.',
        },
        expired: {
          className: 'state state-error',
          headline: '확인 기한 지남 (expired)',
          note: '사람 확인 기한이 만료돼 이번 준비로는 집행할 수 없습니다. 필요하면 보안 기록에서 다시 준비하세요.',
        },
        error: {
          className: 'state state-error',
          headline: '요청 처리 안 됨 (error)',
          note: '요청이 정상 처리되지 않았습니다. 아래 오류 안내를 확인하고 필요하면 제공 화면 버튼으로 다시 확인하세요.',
        },
      };

      const statusInfo = Object.hasOwn(ACTION_STATUS_MAP, effectiveStatus)
        ? ACTION_STATUS_MAP[effectiveStatus]
        : ACTION_STATUS_MAP.unknown;

      const containerAttrs = {
        'data-student-action': 'rendered',
        'data-student-action-status': effectiveStatus,
      };
      if (!intentMismatch) {
        if (eventId) containerAttrs['data-student-action-event'] = eventId;
        if (typeof receipt?.requestId === 'string' && receipt.requestId.trim().length > 0) {
          containerAttrs['data-student-action-request'] = receipt.requestId.trim();
        }
      }

      const container = createEl('div', { attrs: containerAttrs });
      container.appendChild(createEl('h3', { text: '보안 조치 상태 · 원천 처리 결과' }));

      const statusAttrs = (effectiveStatus === 'loading' || effectiveStatus === 'executing' || effectiveStatus === 'pending')
        ? { role: 'status' }
        : (statusInfo.className.includes('state-error') ? { role: 'alert' } : undefined);

      container.appendChild(createEl('p', {
        className: statusInfo.className,
        text: statusInfo.headline,
        attrs: statusAttrs,
      }));
      container.appendChild(createEl('p', {
        className: 'muted',
        text: statusInfo.note,
      }));

      if (intentMismatch) {
        container.appendChild(createEl('p', {
          className: 'state state-error',
          text: '현재 선택된 사건·조치와 영수증 정보가 일치하지 않아 결과를 표시할 수 없습니다.',
          attrs: { role: 'alert' },
        }));
      }

      if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
        container.appendChild(createEl('p', {
          text: sanitizeSafeText(payload.message),
        }));
      }

      if (payload.error && typeof payload.error === 'object') {
        const errCode = sanitizeSafeText(payload.error.code, 'ACTION_RESULT_UNVERIFIED');
        const errMsg = sanitizeSafeText(payload.error.message, '조치 요청 또는 결과를 확인할 수 없습니다.');
        container.appendChild(createEl('p', {
          className: 'state state-error',
          text: `${errCode}: ${errMsg}`,
          attrs: { role: 'alert' },
        }));
      }

      if (receipt?.superseded === true) {
        container.appendChild(createEl('p', {
          className: 'muted',
          text: '이전 조회 결과는 최신 상태를 대신하지 않습니다 (superseded).',
        }));
      }

      const evidenceIds = Array.isArray(event?.evidence)
        ? event.evidence
          .map((e) => (e && typeof e.id === 'string' ? e.id.trim() : ''))
          .filter(Boolean)
        : [];

      const entries = [];
      if (eventId) entries.push(['사건 ID (event.id)', eventId]);
      if (evidenceIds.length > 0) entries.push(['근거 ID', evidenceIds.join(', ')]);
      if (actionId) entries.push(['조치 (actionId)', sanitizeSafeText(actionId)]);
      if (target) {
        if (typeof target.id === 'string' && target.id.trim().length > 0) {
          entries.push(['실제 대상 (target.id)', sanitizeSafeText(target.id)]);
        }
        if (target.generation != null) {
          entries.push(['대상 세대 (target.generation)', String(target.generation)]);
        }
      }
      if (typeof payload.confirmationExpiresAt === 'string' && payload.confirmationExpiresAt.trim().length > 0) {
        entries.push(['확인 기한 (confirmationExpiresAt)', formatCheckedAt(payload.confirmationExpiresAt)]);
      }
      if (receipt) {
        if (typeof receipt.requestId === 'string' && receipt.requestId.trim().length > 0) {
          entries.push(['요청 ID (requestId)', sanitizeSafeText(receipt.requestId)]);
        }
        if (typeof receipt.receiptId === 'string' && receipt.receiptId.trim().length > 0) {
          entries.push(['영수증 ID (receiptId)', sanitizeSafeText(receipt.receiptId)]);
        }
        if (receipt.version != null) {
          entries.push(['버전 (version)', String(receipt.version)]);
        }
      }
      if (observation) {
        if (typeof observation.observedAt === 'string' && observation.observedAt.trim().length > 0) {
          entries.push(['관측 시각 (observation.observedAt)', formatCheckedAt(observation.observedAt)]);
        }
        if (typeof observation.effectApplied === 'boolean') {
          entries.push(['실제 효과 적용 (effectApplied)', `effectApplied: ${observation.effectApplied}`]);
        }
      }

      if (entries.length > 0) {
        const kv = createEl('dl', { className: 'kv' });
        for (const [label, val] of entries) {
          kv.appendChild(createEl('dt', { text: label }));
          kv.appendChild(createEl('dd', { text: val }));
        }
        container.appendChild(kv);
      }

      if (effectiveStatus === 'idle' && (!event || !Array.isArray(event.supportedActions) || event.supportedActions.length === 0)) {
        container.appendChild(createEl('p', {
          className: 'muted',
          text: '현재 기록에는 연동 시스템이 지원하는 조치가 없어 조치 준비 버튼이 표시되지 않는 것이 정상입니다.',
        }));
      }

      container.appendChild(createEl('p', {
        className: 'muted',
        text: '집행·결과 재조회·취소는 위쪽 제공 화면의 버튼을 직접 사용하세요. 조치 취소 버튼은 이미 서버에 전달된 조치 효과를 되돌리지 않습니다.',
      }));

      return container;
    },
  };
}
