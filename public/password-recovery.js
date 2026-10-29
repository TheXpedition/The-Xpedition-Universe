'use strict';
function openPasswordRecovery(){
 const login=$('#authLogin')?.value.trim()||'',email=login.includes('@')?login:'';
 modal(`<div class="modal-kicker">RECUPERA TU CUENTA</div><h2 id="modalTitle">¿Olvidaste tu contraseña?</h2><p class="modal-intro">Escribe el correo con el que te registraste. Te enviaremos un enlace para elegir una nueva contraseña.</p><form id="passwordRecoveryForm"><label class="form-field" for="recoveryEmail">Correo electrónico<input id="recoveryEmail" name="email" type="email" autocomplete="email" maxlength="254" value="${esc(email)}" placeholder="tu@correo.com" required></label><p class="form-hint">Al elegir la contraseña nueva, utiliza al menos 8 caracteres.</p><p class="form-error" id="recoveryError" role="alert"></p><button class="btn primary full" id="recoverySubmit" type="submit">Enviar enlace de recuperación</button></form><button class="link-button" style="margin-top:18px" data-action="login">Volver a iniciar sesión</button>`,false,'password-recovery');
 $('#passwordRecoveryForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('#recoverySubmit'),field=$('#recoveryEmail'),error=$('#recoveryError');
  if(button.disabled)return;button.disabled=true;button.textContent='Enviando…';error.textContent='';
  try{
   const result=await api('/auth/forgot-password',{method:'POST',body:{email:field.value.trim()}});
   if(!button.isConnected)return;
   modal(`<div class="modal-kicker">RECUPERA TU CUENTA</div><h2 id="modalTitle">Revisa tu correo.</h2><p class="modal-intro">${esc(result.message)}</p><p>Abre el enlace, guarda tu nueva contraseña y vuelve aquí para iniciar sesión.</p><button class="btn primary full" data-action="login">Volver a iniciar sesión</button>`,false,'password-recovery-sent');
  }catch(failure){if(error.isConnected){error.textContent=failure.message;button.disabled=false;button.textContent='Enviar enlace de recuperación';}}
 });
 $('#recoveryEmail').focus();
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-action="forgot-password"]');if(!button)return;event.preventDefault();openPasswordRecovery();});
