import { createClient } from '@supabase/supabase-js';

interface Env {
  VITE_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const values = new Uint32Array(10);
  crypto.getRandomValues(values);
  let body = '';
  for (const v of values) body += chars[v % chars.length];
  return `T!${body}`;
};

export const onRequestPost = async (context: any) => {
  const env = context.env as Env;
  if (!env?.VITE_SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ success: false, error: 'Cloudflare 서버 환경변수가 설정되지 않았습니다.' }, 500);
  }

  const authHeader = context.request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return json({ success: false, error: '관리자 인증 토큰이 없습니다.' }, 401);

  const service = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await service.auth.getUser(token);
  const actor = userData.user;
  if (userError || !actor) return json({ success: false, error: '관리자 인증이 만료되었습니다.' }, 401);

  let body: any = {};
  try {
    body = await context.request.json();
  } catch {
    return json({ success: false, error: '요청 데이터가 올바르지 않습니다.' }, 400);
  }

  const requestId = String(body.requestId || '').trim();
  let tempPassword = String(body.customTempPassword || '').trim();
  if (!requestId) return json({ success: false, error: '비밀번호 재설정 신청 ID가 없습니다.' }, 400);
  if (tempPassword && tempPassword.length < 8) {
    return json({ success: false, error: '임시 비밀번호는 8자리 이상으로 설정해 주세요.' }, 400);
  }
  if (tempPassword.length > 72) {
    return json({ success: false, error: '임시 비밀번호가 너무 깁니다.' }, 400);
  }
  if (!tempPassword) tempPassword = generateTempPassword();

  const { data: actorProfile, error: actorProfileError } = await service
    .from('profiles')
    .select('id,name,role,status,company_id')
    .eq('id', actor.id)
    .single();
  if (actorProfileError || !actorProfile || actorProfile.status !== 'APPROVED') {
    return json({ success: false, error: '관리자 프로필을 확인할 수 없습니다.' }, 403);
  }
  if (!['ADMIN', 'SUPER_ADMIN'].includes(actorProfile.role)) {
    return json({ success: false, error: '관리자만 임시 비밀번호를 발급할 수 있습니다.' }, 403);
  }

  const { data: resetRequest, error: requestError } = await service
    .from('password_reset_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (requestError || !resetRequest) {
    return json({ success: false, error: '비밀번호 재설정 신청 내역을 찾을 수 없습니다.' }, 404);
  }

  if (actorProfile.role === 'ADMIN' && resetRequest.company_id !== actorProfile.company_id) {
    return json({ success: false, error: '다른 회사 계정의 비밀번호는 변경할 수 없습니다.' }, 403);
  }

  const { data: targetProfile, error: targetError } = await service
    .from('profiles')
    .select('id,name,email,role,status,company_id')
    .eq('id', resetRequest.user_id)
    .single();
  if (targetError || !targetProfile) {
    return json({ success: false, error: '대상 계정을 찾을 수 없습니다.' }, 404);
  }
  if (targetProfile.role === 'SUPER_ADMIN') {
    return json({ success: false, error: '최고관리자 계정은 이 기능으로 초기화할 수 없습니다.' }, 403);
  }

  const { error: updateAuthError } = await service.auth.admin.updateUserById(targetProfile.id, {
    password: tempPassword,
  });
  if (updateAuthError) {
    return json({ success: false, error: `Supabase Auth 비밀번호 변경 실패: ${updateAuthError.message}` }, 500);
  }

  const issuedAt = new Date().toISOString();
  const { error: profileUpdateError } = await service
    .from('profiles')
    .update({ require_password_change: true, temp_password_issued_at: issuedAt })
    .eq('id', targetProfile.id);
  if (profileUpdateError) {
    return json({ success: false, error: `프로필 상태 저장 실패: ${profileUpdateError.message}` }, 500);
  }

  const { error: requestUpdateError } = await service
    .from('password_reset_requests')
    .update({
      status: 'ISSUED',
      issued_at: issuedAt,
      issued_by: actorProfile.id,
      issued_by_name: actorProfile.name,
      completed_at: null,
    })
    .eq('id', requestId);
  if (requestUpdateError) {
    return json({ success: false, error: `재설정 신청 상태 저장 실패: ${requestUpdateError.message}` }, 500);
  }

  await service.from('audit_logs').insert({
    company_id: targetProfile.company_id,
    actor_id: actorProfile.id,
    target_user_id: targetProfile.id,
    action_type: 'PASSWORD_RESET',
    action_title: '관리자 임시 비밀번호 발급',
    details: {
      request_id: requestId,
      target_email: targetProfile.email,
      require_password_change: true,
    },
  });

  // Security: the plaintext temporary password is returned once and never stored in DB.
  return json({ success: true, tempPassword });
};
