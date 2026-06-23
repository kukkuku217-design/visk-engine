window.onload = () => {
    const container = document.getElementById('game-side');
    if (!container) return;

    const scene = new THREE.Scene();

    const camera3D = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera3D.position.set(2, 2, 4);
    camera3D.lookAt(0, 0, 0);

    const aspect = container.clientWidth / container.clientHeight;
    const d = 4;
    const camera2D = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera2D.position.set(0, 0, 5);
    camera2D.lookAt(0, 0, 0);

    let activeCamera = camera3D;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x111116);
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(3, 6, 3);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    document.getElementById('dimension-select').addEventListener('change', (e) => {
        activeCamera = (e.target.value === '3D') ? camera3D : camera2D;
    });

    function animate() {
        requestAnimationFrame(animate);
        scene.traverse(obj => {
            if (obj.isMesh && obj.name === "cube3d") {
                obj.rotation.x += 0.015;
                obj.rotation.y += 0.015;
            }
        });
        renderer.render(scene, activeCamera);
    }
    animate();

    document.getElementById('run-btn').addEventListener('click', () => {
        const codeInput = document.getElementById('code-input');
        if (!codeInput) return;
        
        const code = codeInput.value;
        const lines = code.split('\n');

        const toRemove = [];
        scene.traverse(obj => { if (obj.isMesh) toRemove.push(obj); });
        toRemove.forEach(obj => scene.remove(obj));

        // По умолчанию прячем текстовое окно при перезапуске кода
        const dialogueBox = document.getElementById('dialogue-box');
        if (dialogueBox) dialogueBox.style.display = 'none';

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed === "" || trimmed.startsWith("#")) return;

            const parts = trimmed.split(/\s+/);
            const command = parts[0];

            if (command === 'bg_color') {
                renderer.setClearColor(parts[1]);
            }

            if (command === 'cube_spawn') {
                const geom = new THREE.BoxGeometry(1.2, 1.2, 1.2);
                const userColor = parts[4] || '#00ff66'; 
                const mat = new THREE.MeshStandardMaterial({ color: userColor, roughness: 0.3 });
                const cube = new THREE.Mesh(geom, mat);
                cube.name = "cube3d";
                
                const x = parseFloat(parts[1]) || 0;
                const y = parseFloat(parts[2]) || 0;
                const z = parseFloat(parts[3]) || 0;
                cube.position.set(x, y, z);
                
                scene.add(cube);
            }

            if (command === 'sprite_show') {
                const geom = new THREE.PlaneGeometry(1.3, 1.8);
                const userColor = parts[3] || '#ff0055';
                const mat = new THREE.MeshBasicMaterial({ color: userColor, side: THREE.DoubleSide });
                const sprite = new THREE.Mesh(geom, mat);
                
                const x = parseFloat(parts[1]) || 0;
                const y = parseFloat(parts[2]) || 0;
                sprite.position.set(x, y, 0);
                
                scene.add(sprite);
            }

            if (command === 'text_show') {
                const dialogueText = document.getElementById('dialogue-text');
                if (dialogueBox && dialogueText) {
                    const message = trimmed.substring(trimmed.indexOf(' ') + 1);
                    dialogueText.innerText = message;
                    dialogueBox.style.display = 'block';
                }
            }
        });
    });
};