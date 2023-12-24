let audioContext = null;

const canvas = document.getElementById("canvas");
const canvasContext = canvas.getContext("2d");

initGraph();

document.getElementById('on-off').addEventListener('click', toggleOnOff);

function initGraph() {
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    canvasContext.lineWidth = 2;
    canvasContext.strokeStyle = "rgb(0, 0, 0)";

    canvasContext.beginPath();

    const y = canvas.height / 2;
    canvasContext.moveTo(0, y);
    canvasContext.lineTo(canvas.width, y);
    canvasContext.stroke();
}

function graph(dataArray, bufferLength) {
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    canvasContext.lineWidth = 2;
    canvasContext.strokeStyle = "rgb(0, 0, 0)";

    const sliceWidth = (canvas.width * 1.0) / bufferLength;    
    let x = 0;
    canvasContext.beginPath();
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
            canvasContext.moveTo(x, y);
        } else {
            canvasContext.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasContext.lineTo(canvas.width, canvas.height / 2);
    canvasContext.stroke();
}

function toggleOnOff() {
    if (document.getElementById('on-off').checked == true) {
        if (audioContext == null) {
            audioContext = new AudioContext();
        } else if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        id = navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
                latency: 0
            }
        }).then((stream) => {
            // Default values
            var freq = 125;
            var sens = 55 / 100;
            const MIN_RMS = 0.005;

            // Processing nodes
            const inputNode = audioContext.createMediaStreamSource(stream);
            const dryNode = audioContext.createGain();
            const analyserNode = audioContext.createAnalyser();
            const filterNode = audioContext.createBiquadFilter();
            const wetNode = audioContext.createGain();

            // Set the defaults
            filterNode.Q.setValueAtTime(15, audioContext.currentTime);
            dryNode.gain.setValueAtTime(50 / 100, audioContext.currentTime);
            wetNode.gain.setValueAtTime(50 / 100, audioContext.currentTime);

            // Conect the nodes
            inputNode.connect(analyserNode);
            inputNode.connect(dryNode);
            inputNode.connect(filterNode);
            filterNode.connect(wetNode);
            dryNode.connect(audioContext.destination);
            wetNode.connect(audioContext.destination);

            // Control events
            document.getElementById('q-value').addEventListener('input', function () {
                filterNode.Q.setValueAtTime(this.value, audioContext.currentTime);
            });
            document.getElementById('decay-value').addEventListener('input', function () {
                freq = this.value;
            });
            document.getElementById('mix-value').addEventListener('input', function () {
                dryNode.gain.setValueAtTime((100 - this.value) / 100, audioContext.currentTime);
                wetNode.gain.setValueAtTime(this.value / 100, audioContext.currentTime);
            });
            document.getElementById('sens-value').addEventListener('input', function () {
                sens = this.value / 100;
            });

            // Envelope generator
            setInterval(function () {
                if (audioContext.state !== 'suspended') {
                    var dataArray = new Uint8Array(analyserNode.frequencyBinCount);
                    const bufferLength = analyserNode.frequencyBinCount;
                    
                    // Time domain values
                    analyserNode.getByteTimeDomainData(dataArray);
                    
                    // Get the RMS value as a value of intensity (envelope)
                    var rms = Math.sqrt(
                        dataArray.reduce(function(acc, val) {
                            return acc + Math.pow((val - 128) / 128, 2);
                        }, 0) / dataArray.length
                    );

                    // Get a new cut off frequency based on the envelope and the sensibility
                    newFreq = rms * freq / MIN_RMS * sens;
                    filterNode.frequency.setValueAtTime(newFreq, audioContext.currentTime);
                    
                    graph(dataArray, bufferLength);
                }
            }, 10);
        }).catch((error) => {
            console.error('Error:', error);

            return null;
        });
    } else {
        if (audioContext != null) {
            audioContext.suspend();
            initGraph()
        }
    }
}
