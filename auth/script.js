const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

function setButtonLoading(btn, loading=true){
	if(!btn) return;
	const text = btn.querySelector('.btn-text');
	const spin = btn.querySelector('.btn-loading');
	if(loading){
		btn.disabled = true;
		if(text) text.style.display='none';
		if(spin) spin.hidden=false;
	}else{
		btn.disabled = false;
		if(text) text.style.display='';
		if(spin) spin.hidden=true;
	}
}

function showLoading(action, redirect){
	const params = new URLSearchParams({action, redirect: redirect || '../index.html'});
	window.location.href = `../loading/index.html?${params.toString()}`;
}

function hashPassword(pw){
	let h=0; for(let i=0;i<pw.length;i++){ h=(h<<5)-h+pw.charCodeAt(i); h|=0; }
	return `h${Math.abs(h)}`;
}

function reveal(){
	const io = new IntersectionObserver((es)=>{
		es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('show'); io.unobserve(e.target);} });
	},{threshold:.12});
	$$('.reveal').forEach(el=>io.observe(el));
}

document.addEventListener('DOMContentLoaded', ()=>{
	reveal();
	const loginForm = $('#loginPageForm');
	if(loginForm){
		loginForm.addEventListener('submit', async (e)=>{
			e.preventDefault();
			const email = $('#loginEmail').value.trim();
			const password = $('#loginPassword').value.trim();
			const btn = $('#loginPageBtn');
			const err = $('#loginPageError');
			if(!email || !password){ err.textContent='All fields are required'; return; }
			try{
				const user = await db.getUserByEmail(email);
				if(user && user.password === hashPassword(password)){
					await db.updateUserLogin(email);
					await db.createSession(email);
					setButtonLoading(btn,true);
					setTimeout(()=>showLoading('login','../User_profile_dashboard/index.html'),400);
				}else{
					err.textContent='Invalid email or password';
				}
			}catch{
				err.textContent='Login failed. Please try again.';
			}
		});
	}

	const regForm = $('#registerPageForm');
	if(regForm){
		regForm.addEventListener('submit', async (e)=>{
			e.preventDefault();
			const name = $('#regName').value.trim();
			const email = $('#regEmail').value.trim();
			const mobile = $('#regMobile').value.trim();
			const password = $('#regPassword').value.trim();
			const btn = $('#registerPageBtn');
			const err = $('#registerPageError');
			if(!name || !email || !mobile || !password){ err.textContent='All fields are required'; return; }
			try{
				const existing = await db.getUserByEmail(email);
				if(existing){ err.textContent='Email already registered'; return; }
				await db.addUser({name,email,compactMobile:mobile,password:hashPassword(password)});
				await db.createSession(email);
				setButtonLoading(btn,true);
				setTimeout(()=>showLoading('register','../User_profile_dashboard/index.html'),400);
			}catch{
				err.textContent='Registration failed. Please try again.';
			}
		});
	}
});
