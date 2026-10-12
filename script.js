
        let THREE, FontLoader, TextGeometry, FilesetResolver, HandLandmarker;

        let handLandmarker, video, canvas, renderer, scene, camera, debugCanvas, debugCtx; 
        let textMesh, loadedFont, currentLetter = "";
        let isAppRunning = false;
        let isAppStarting = false;
        let cameraStream = null;
        
        let constructedWord = "";
        let stableCounter = 0;
        let lastDetected = "";
        let lastTyped = "";
        const STABLE_THRESHOLD = 8; 

        const HAND_CONNECTIONS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];

        // --- UI FUNCTIONS ---
        window.showInfo = () => document.getElementById('info-modal').style.display = 'flex';
        window.closeInfo = () => document.getElementById('info-modal').style.display = 'none';

        // --- AUDIO ---
        function initAudio() { const s = window.speechSynthesis; s.speak(new SpeechSynthesisUtterance("")); }
        function speak(text) {
            window.speechSynthesis.cancel(); 
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'id-ID'; u.rate = 1.0; u.pitch = 1.2; 
            window.speechSynthesis.speak(u);
        }
        window.speakWord = () => { if(constructedWord) speak(constructedWord); else speak("Belum ada kata"); };
        window.clearWord = () => { constructedWord = ""; lastTyped = ""; updateWordUI(); speak("Hapus"); };

        function updateWordUI() {
            const display = document.getElementById('word-display');
            display.innerText = constructedWord || "_";
        }

        window.startApp = () => {
            if (isAppRunning || isAppStarting) return;
            isAppStarting = true;
            initAudio();
            document.getElementById('home-screen').style.transform = "translateY(-100%)";
            document.getElementById('ar-screen').style.display = 'block';
            document.getElementById('loading-overlay').style.display = 'flex';
            document.getElementById('loading-message').innerText = "Meminta izin kamera...";
            document.getElementById('loading-overlay').querySelector('i').style.display = 'block';
            document.getElementById('retry-button').style.display = 'none';
            speak("Ayo tulis kata A KU");
            initAR();
        };
        window.backToHome = () => {
            document.getElementById('home-screen').style.transform = "translateY(0%)";
            setTimeout(() => document.getElementById('ar-screen').style.display = 'none', 500);
        };

        async function initAR() {
            try {
            video = document.getElementById('webcam');
            canvas = document.getElementById('output_canvas');
            debugCanvas = document.getElementById('debug_canvas');
            debugCtx = debugCanvas.getContext('2d');

            const constraints = { video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } };
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Browser tidak menyediakan akses kamera untuk halaman ini.");
            }
            cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = cameraStream;
            await video.play();
            document.getElementById('loading-message').innerText = "Kamera aktif. Memuat komponen latihan...";

            const [threeModule, fontLoaderModule, textGeometryModule, visionModule] = await Promise.all([
                import('three'),
                import('three/addons/loaders/FontLoader.js'),
                import('three/addons/geometries/TextGeometry.js'),
                import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js")
            ]);
            THREE = threeModule;
            FontLoader = fontLoaderModule.FontLoader;
            TextGeometry = textGeometryModule.TextGeometry;
            FilesetResolver = visionModule.FilesetResolver;
            HandLandmarker = visionModule.HandLandmarker;
            textMaterial = new THREE.MeshPhysicalMaterial({ color: 0xFFA500, metalness: 0.1, roughness: 0.2, clearcoat: 1.0 });

            if (!renderer) {
                scene = new THREE.Scene();
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
                scene.add(ambientLight);
                const dirLight = new THREE.DirectionalLight(0xffd700, 0.5);
                dirLight.position.set(5, 10, 7);
                scene.add(dirLight);

                camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
                camera.position.z = 15;

                renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            }

            const fLoader = new FontLoader();
            const fontPromise = new Promise(r => fLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/gentilis_bold.typeface.json', r));
            const visionPromise = FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
            document.getElementById('loading-message').innerText = "Izinkan kamera dan tunggu model siap...";
            const [font, vision] = await Promise.all([fontPromise, visionPromise]);
            loadedFont = font;

            if (!handLandmarker) {
                const options = {
                    baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
                    runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6, minTrackingConfidence: 0.6
                };
                try {
                    handLandmarker = await HandLandmarker.createFromOptions(vision, options);
                } catch {
                    options.baseOptions.delegate = "CPU";
                    handLandmarker = await HandLandmarker.createFromOptions(vision, options);
                }
            }

            document.getElementById('loading-overlay').style.display = 'none';
            isAppStarting = false;
            isAppRunning = true;
            loop();
            } catch (error) {
                console.error("Gagal menyiapkan kamera:", error);
                cameraStream?.getTracks().forEach(track => track.stop());
                cameraStream = null;
                isAppStarting = false;
                isAppRunning = false;
                video.srcObject = null;
                document.getElementById('loading-overlay').querySelector('i').style.display = 'none';
                document.getElementById('loading-message').innerText = error.name === "NotAllowedError"
                    ? "Izin kamera ditolak. Izinkan kamera di pengaturan situs, lalu coba lagi."
                    : error.message || "Kamera atau model gagal dimuat. Periksa koneksi dan coba lagi.";
                document.getElementById('retry-button').style.display = 'inline-block';
            }
        }

        let textMaterial;

        function detectLetters(lm, lm2, isDualHand) {
            const wrist = 0;
            const getDist = (i, j) => Math.hypot(lm[i].x - lm[j].x, lm[i].y - lm[j].y);
            const isExt = (tip, pip) => getDist(wrist, tip) > getDist(wrist, pip) + 0.02;

            const T = isExt(8, 6);   // Telunjuk
            const M = isExt(12, 10); // Tengah
            const R = isExt(16, 14); // Manis
            const K = isExt(20, 18); // Kelingking
            const J = isExt(4, 2);   // Jempol
            const distO = getDist(4, 8);

            if (isDualHand && lm2) {
                if (Math.hypot(lm[8].x - lm2[8].x, lm[8].y - lm2[8].y) < 0.15) return "A";
            }
            if (T && M && J && !R && !K) return "K";
            if (T && M && R && !K) return "E";
            if (T && J && !M && !R && !K) return "U";
            if (K && !T && !M && !R) return "I";
            if (distO < 0.06) return "O";
            return "";
        }

        function handleTyping(char) {
            if (char !== "") {
                if (char === lastDetected) {
                    stableCounter++;
                    if (stableCounter > STABLE_THRESHOLD && char !== lastTyped) {
                        constructedWord += char;
                        lastTyped = char;
                        updateWordUI();
                        speak(char);
                        const box = document.getElementById('word-display');
                        box.classList.add('pulse');
                        setTimeout(() => box.classList.remove('pulse'), 200);
                    }
                } else {
                    stableCounter = 0;
                    lastDetected = char;
                }
            } else {
                stableCounter = 0;
                lastDetected = "";
                lastTyped = ""; 
            }
        }

        function updateDisplay(char, handPos) {
            if(char !== currentLetter && char !== "") {
                if(textMesh) { scene.remove(textMesh); textMesh.geometry.dispose(); }
                const geometry = new TextGeometry(char, { 
                    font: loadedFont, size: 2.5, height: 0.5, 
                    curveSegments: 10, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05 
                });
                geometry.center();
                const colors = [0xFF6347, 0x1E90FF, 0x32CD32, 0xFFD700, 0xFF69B4];
                textMaterial.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
                textMesh = new THREE.Mesh(geometry, textMaterial);
                scene.add(textMesh);
                const bubble = document.getElementById('res-bubble');
                bubble.style.transform = "translateX(-50%) scale(1.3)";
                setTimeout(() => bubble.style.transform = "translateX(-50%) scale(1)", 200);
            }
            if(char === "") {
                if(textMesh) { scene.remove(textMesh); textMesh.geometry.dispose(); textMesh=null; }
            }
            currentLetter = char;
            if(textMesh) {
                const targetVec = new THREE.Vector3((handPos.x - 0.5) * 15, -(handPos.y - 0.5) * 10 + 2, 0);
                textMesh.position.lerp(targetVec, 0.1);
                textMesh.rotation.y += 0.02;
            }
            document.getElementById('big-char').innerText = char || "?";
        }

        function drawSkeleton(landmarks) {
            const w = debugCanvas.width;
            const h = debugCanvas.height;
            debugCtx.lineWidth = 3;
            debugCtx.strokeStyle = "#00FFFF"; 
            debugCtx.lineCap = "round";
            debugCtx.lineJoin = "round";
            debugCtx.beginPath();
            for (const connection of HAND_CONNECTIONS) {
                const start = landmarks[connection[0]];
                const end = landmarks[connection[1]];
                debugCtx.moveTo(start.x * w, start.y * h);
                debugCtx.lineTo(end.x * w, end.y * h);
            }
            debugCtx.stroke();
            debugCtx.fillStyle = "#FFD700"; 
            for (const lm of landmarks) {
                debugCtx.beginPath();
                debugCtx.arc(lm.x * w, lm.y * h, 4, 0, 2 * Math.PI);
                debugCtx.fill();
            }
        }

        function loop() {
            const width = window.innerWidth; const height = window.innerHeight;
            if (canvas.width !== width) { 
                renderer.setSize(width, height); 
                camera.aspect = width/height; 
                camera.updateProjectionMatrix();
                debugCanvas.width = width;
                debugCanvas.height = height;
            }

            let startTimeMs = performance.now();
            
            if (handLandmarker && video.currentTime > 0) {
                const results = handLandmarker.detectForVideo(video, startTimeMs);
                let detected = "";
                let handPos = {x:0.5, y:0.5};

                debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);

                if (results.landmarks.length > 0) {
                    const lm = results.landmarks[0];
                    const lm2 = results.landmarks.length > 1 ? results.landmarks[1] : null;
                    const isDualHand = results.landmarks.length > 1;
                    
                    for (const landmarks of results.landmarks) {
                        drawSkeleton(landmarks);
                    }

                    handPos = lm[9];
                    detected = detectLetters(lm, lm2, isDualHand);
                }
                
                handleTyping(detected);
                updateDisplay(detected, handPos);
            }
            renderer.render(scene, camera);
            requestAnimationFrame(loop);
        }
    
