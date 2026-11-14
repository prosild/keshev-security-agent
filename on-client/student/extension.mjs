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

function createEl(tag, options = {}, children = []) {
  const node = document.createElement(tag);
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
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
