window.onload = () => {
    const container = document.getElementById('game-side');
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a1a1f, 0.04);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x1a1a1f);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    const sunLight = new THREE.DirectionalLight(0xfff5eb, 2.5);
    sunLight.position.set(10, 20, 10);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x556677, 0.5));

    const textureLoader = new THREE.TextureLoader();
    let currentMusic = null;

    let shakeTime = 0;
    let activeBg = null;
    let activeSprite = null;
    
    let playerTank = null;
    let tankMoveSpeed = 0.07;
    let tankRotSpeed = 0.03;
    let cameraFollowDist = 6;
    let cameraFollowHeight = 2.5;
    let tankBullets = [];

    let keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false };
    let rotationX = 0, rotationY = 0;

    container.addEventListener('click', () => {
        const mode = document.getElementById('dimension-select').value;
        if (mode === '3D_FPS') container.requestPointerLock();
        if (mode === '3D_VEHICLE' && playerTank) fireTankBullet();
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === container) {
            rotationX -= e.movementX * 0.002;
            rotationY -= e.movementY * 0.002;
            rotationY = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, rotationY));
            camera.quaternion.setFromEuler(new THREE.Euler(rotationY, rotationX, 0, 'YXZ'));
        }
    });

    document.addEventListener('keydown', (e) => { if (e.code in keys) keys[e.code] = true; });
    document.addEventListener('keyup', (e) => { if (e.code in keys) keys[e.code] = false; });

    function fireTankBullet() {
        const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        bullet.position.copy(playerTank.position);
        bullet.position.y += 0.6;
        
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(playerTank.quaternion);
        bullet.userData = { dir: direction, speed: 0.4 };
        
        scene.add(bullet);
        tankBullets.push(bullet);
        shakeTime = 0.3;
    }

    function updateGameplay() {
        const mode = document.getElementById('dimension-select').value;

        if (mode === '3D_FPS' && document.pointerLockElement === container) {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            forward.y = 0; right.y = 0; forward.normalize(); right.normalize();

            if (keys.KeyW) camera.position.addScaledVector(forward, 0.08);
            if (keys.KeyS) camera.position.addScaledVector(forward, -0.08);
            if (keys.KeyA) camera.position.addScaledVector(right, -0.08);
            if (keys.KeyD) camera.position.addScaledVector(right, 0.08);
        }

        if (mode === '3D_VEHICLE' && playerTank) {
            if (keys.KeyW) playerTank.position.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(playerTank.quaternion), tankMoveSpeed);
            if (keys.KeyS) playerTank.position.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(playerTank.quaternion), -tankMoveSpeed * 0.6);
            if (keys.KeyA) playerTank.rotation.y += tankRotSpeed;
            if (keys.KeyD) playerTank.rotation.y -= tankRotSpeed;

            const offset = new THREE.Vector3(0, cameraFollowHeight, cameraFollowDist).applyQuaternion(playerTank.quaternion);
            camera.position.copy(playerTank.position).add(offset);
            camera.lookAt(playerTank.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
        }

        for (let i = tankBullets.length - 1; i >= 0; i--) {
            let b = tankBullets[i];
            b.position.addScaledVector(b.userData.dir, b.userData.speed);
            if (b.position.length() > 200) { scene.remove(b); tankBullets.splice(i, 1); }
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        updateGameplay();

        if (shakeTime > 0) {
            shakeTime -= 0.05;
            camera.position.x += (Math.random() - 0.5) * 0.12;
            camera.position.y += (Math.random() - 0.5) * 0.12;
        }

        if (activeBg && activeBg.material.opacity < 1) activeBg.material.opacity += 0.05;

        renderer.render(scene, camera);
    }
    animate();

    document.getElementById('run-btn').addEventListener('click', () => {
        const codeInput = document.getElementById('code-input');
        if (!codeInput) return;
        
        const lines = codeInput.value.split('\n');
        const mode = document.getElementById('dimension-select').value;

        const toRemove = [];
        scene.traverse(obj => { if (obj.isMesh) toRemove.push(obj); });
        toRemove.forEach(obj => scene.remove(obj));
        activeBg = null; activeSprite = null; playerTank = null; tankBullets = [];

        if (mode !== '3D_VEHICLE') { camera.position.set(0, 1.6, 5); camera.rotation.set(0,0,0); }
        document.getElementById('dialogue-box').style.display = 'none';
        const aspect = container.clientWidth / container.clientHeight;

        if (mode.startsWith('3D')) {
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x22251e, roughness: 0.9 }));
            floor.rotation.x = -Math.PI / 2; scene.add(floor);
        }

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed === "" || trimmed.startsWith("#")) return;

            const parts = trimmed.split(/\s+/);
            const command = parts[0];

            if (command === 'tank_spawn') {
                const tankGroup = new THREE.Group();
                const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 3), new THREE.MeshStandardMaterial({color: 0x445533, roughness: 0.6}));
                body.position.y = 0.3; tankGroup.add(body);
                const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.5), new THREE.MeshStandardMaterial({color: 0x334422}));
                cabin.position.set(0, 0.85, -0.2); tankGroup.add(cabin);
                const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8), new THREE.MeshStandardMaterial({color: 0x223311}));
                gun.rotation.x = Math.PI / 2; gun.position.set(0, 0.85, -1.5); tankGroup.add(gun);
                tankGroup.position.set(parseFloat(parts[1])||0, parseFloat(parts[2])||0, parseFloat(parts[3])||0);
                scene.add(tankGroup); playerTank = tankGroup;
            }

            if (command === 'tank_speed') tankMoveSpeed = parseFloat(parts[1]) || 0.07;
            if (command === 'camera_dist') { cameraFollowDist = parseFloat(parts[1]) || 6; cameraFollowHeight = parseFloat(parts[2]) || 2.5; }

            if (command === 'object_spawn') {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshStandardMaterial({ color: 0x555558, roughness: 0.8 }));
                mesh.position.set(parseFloat(parts[1]), parseFloat(parts[2])+2, parseFloat(parts[3])); scene.add(mesh);
            }
            if (command === 'fog_set') scene.fog.density = parseFloat(parts[1]);
            if (command === 'play_music') {
                if (currentMusic) currentMusic.pause();
                currentMusic = new Audio(parts[1]); currentMusic.loop = true; currentMusic.play().catch(()=>{});
            }
            if (command === 'bg_fade') {
                textureLoader.load(parts[1], (t) => {
                    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true }); m.opacity = 0;
                    activeBg = new THREE.Mesh(new THREE.PlaneGeometry(8*aspect, 8), m); activeBg.position.set(0,1.6,0); scene.add(activeBg);
                });
            }
            if (command === 'text_show') {
                document.getElementById('dialogue-text').innerText = trimmed.substring(trimmed.indexOf(' ')+1);
                document.getElementById('dialogue-box').style.display = 'block';
            }
        });
    });
};
