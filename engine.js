window.onload = () => {
    const container = document.getElementById('game-side');
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a1a1f, 0.08); // Мрачный туман по умолчанию

    // Камера игрока
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5); // Глаза игрока на высоте 1.6м

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x1a1a1f);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Освещение (как солнце в Зоне)
    const sunLight = new THREE.DirectionalLight(0xfff5eb, 2.5);
    sunLight.position.set(10, 20, 10);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x556677, 0.4));

    const textureLoader = new THREE.TextureLoader();
    let currentMusic = null;

    // Системные переменные для эффектов
    let shakeTime = 0;
    let activeBg = null;
    let activeSprite = null;

    // --- СИСТЕМА УПРАВЛЕНИЯ ОТ ПЕРВОГО ЛИЦА (FPS) ---
    let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
    let rotationX = 0, rotationY = 0;
    const speed = 0.08;

    // Захват курсора при клике на экран (только если выбран 3D режим)
    container.addEventListener('click', () => {
        const mode = document.getElementById('dimension-select').value;
        if (mode === '3D') container.requestPointerLock();
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === container) {
            rotationX -= e.movementX * 0.002;
            rotationY -= e.movementY * 0.002;
            rotationY = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, rotationY));
            camera.quaternion.setFromEuler(new THREE.Euler(rotationY, rotationX, 0, 'YXZ'));
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW') moveForward = true;
        if (e.code === 'KeyS') moveBackward = true;
        if (e.code === 'KeyA') moveLeft = true;
        if (e.code === 'KeyD') moveRight = true;
    });
    document.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') moveForward = false;
        if (e.code === 'KeyS') moveBackward = false;
        if (e.code === 'KeyA') moveLeft = false;
        if (e.code === 'KeyD') moveRight = false;
    });

    function updateMovement() {
        if (document.pointerLockElement !== container) return;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        forward.y = 0; right.y = 0;
        forward.normalize(); right.normalize();

        if (moveForward) camera.position.addScaledVector(forward, speed);
        if (moveBackward) camera.position.addScaledVector(forward, -speed);
        if (moveLeft) camera.position.addScaledVector(right, -speed);
        if (moveRight) camera.position.addScaledVector(right, speed);
    }

    // РЕНДЕР-ЦИКЛ + ЭФФЕКТЫ
    function animate() {
        requestAnimationFrame(animate);
        
        const mode = document.getElementById('dimension-select').value;
        if (mode === '3D') {
            updateMovement();
        }

        // Эффект тряски экрана (Screen Shake)
        if (shakeTime > 0) {
            shakeTime -= 0.05;
            camera.position.x += (Math.random() - 0.5) * 0.15;
            camera.position.y += (Math.random() - 0.5) * 0.15;
            if (shakeTime <= 0) { camera.position.x = 0; camera.position.y = (mode === '3D') ? 1.6 : 1.6; }
        }

        // Плавное появление фона (2D Fade)
        if (activeBg && activeBg.material.opacity < 1) {
            activeBg.material.opacity += 0.05;
        }

        renderer.render(scene, camera);
    }
    animate();

    // ПАРСЕР КОМАНД ДЛЯ ИГР
    document.getElementById('run-btn').addEventListener('click', () => {
        const codeInput = document.getElementById('code-input');
        if (!codeInput) return;
        
        const lines = codeInput.value.split('\n');
        const mode = document.getElementById('dimension-select').value;

        // Очистка старых 3D объектов
        const toRemove = [];
        scene.traverse(obj => { if (obj.isMesh) toRemove.push(obj); });
        toRemove.forEach(obj => scene.remove(obj));
        activeBg = null; activeSprite = null;

        // Настройка камеры под режим
        if (mode === '2D') {
            camera.position.set(0, 1.6, 5);
            camera.rotation.set(0, 0, 0);
        }

        // Сброс окон текста
        document.getElementById('dialogue-box').style.display = 'none';
        document.getElementById('speaker-title').innerText = '';

        const aspect = container.clientWidth / container.clientHeight;

        // Создаем землю ТОЛЬКО для 3D
        if (mode === '3D') {
            const floorGeom = new THREE.PlaneGeometry(100, 100);
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.9 });
            const floor = new THREE.Mesh(floorGeom, floorMat);
            floor.rotation.x = -Math.PI / 2;
            scene.add(floor);
        }

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed === "" || trimmed.startsWith("#")) return;

            const parts = trimmed.split(/\s+/);
            const command = parts[0];

            // --- 2D КОМАНДЫ ---
            if (command === 'bg_fade') {
                textureLoader.load(parts[1], (texture) => {
                    const geom = new THREE.PlaneGeometry(8 * aspect, 8);
                    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
                    mat.opacity = 0;
                    activeBg = new THREE.Mesh(geom, mat);
                    activeBg.position.set(0, 1.6, 0);
                    scene.add(activeBg);
                });
            }

            if (command === 'sprite_img') {
                textureLoader.load(parts[3], (texture) => {
                    const geom = new THREE.PlaneGeometry(2.2, 3.0);
                    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
                    activeSprite = new THREE.Mesh(geom, mat);
                    activeSprite.position.set(parseFloat(parts[1]), parseFloat(parts[2]) + 1.6, 0.2);
                    scene.add(activeSprite);
                });
            }

            if (command === 'sprite_state') {
                if (activeSprite) {
                    textureLoader.load(parts[1], (texture) => {
                        activeSprite.material.map = texture;
                        activeSprite.material.needsUpdate = true;
                    });
                }
            }

            if (command === 'screen_shake') {
                shakeTime = 1.0;
            }

            if (command === 'speaker_name') {
                const name = trimmed.substring(trimmed.indexOf(' ') + 1);
                document.getElementById('speaker-title').innerText = name;
            }

            if (command === 'text_show') {
                const message = trimmed.substring(trimmed.indexOf(' ') + 1);
                document.getElementById('dialogue-text').innerText = message;
                document.getElementById('dialogue-box').style.display = 'block';
            }

            // --- 3D КОМАНДЫ ---
            if (command === 'object_spawn') {
                const x = parseFloat(parts[1]) || 0;
                const y = parseFloat(parts[2]) || 0;
                const z = parseFloat(parts[3]) || 0;
                const textureFolder = parts[4];

                const geom = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                let mat;

                if (textureFolder) {
                    const albedo = textureLoader.load(`${textureFolder}/albedo.jpg`);
                    const normal = textureLoader.load(`${textureFolder}/normal.jpg`);
                    const roughness = textureLoader.load(`${textureFolder}/roughness.jpg`);
                    mat = new THREE.MeshStandardMaterial({ map: albedo, normalMap: normal, roughnessMap: roughness, roughness: 1.0 });
                } else {
                    mat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7 });
                }

                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.set(x, y + 0.75, z);
                scene.add(mesh);
            }

            if (command === 'fog_set') {
                scene.fog.density = parseFloat(parts[1]) || 0.02;
            }

            // МЕДИА
            if (command === 'play_music') {
                if (currentMusic) currentMusic.pause();
                currentMusic = new Audio(parts[1]); currentMusic.loop = true; currentMusic.volume = 0.4;
                currentMusic.play().catch(() => {});
            }
            if (command === 'play_sound') {
                const sound = new Audio(parts[1]); sound.volume = 0.6; sound.play();
            }
        });
    });
};
