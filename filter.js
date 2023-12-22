let audioContext = null;

document.getElementById('on-off').addEventListener('click', toggleOnOff);

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
            var freq = 100;
            var sens = 1;
            const MIN_RMS = 0.005;

            const inputNode = audioContext.createMediaStreamSource(stream);
            const dryNode = audioContext.createGain();
            const analyserNode = audioContext.createAnalyser();
            const filterNode = audioContext.createBiquadFilter();
            const wetNode = audioContext.createGain();

            filterNode.Q.setValueAtTime(20, audioContext.currentTime);

            inputNode.connect(analyserNode);
            inputNode.connect(dryNode);
            inputNode.connect(filterNode);
            filterNode.connect(wetNode);
            dryNode.connect(audioContext.destination);
            wetNode.connect(audioContext.destination);

            document.getElementById('q-value').addEventListener('input', function () {
                filterNode.Q.setValueAtTime(this.value, audioContext.currentTime);
            });

            document.getElementById('decay-value').addEventListener('input', function () {
                freq = this.value;
            });

            document.getElementById('mix-value').addEventListener('input', function () {
                dryNode.gain.setValueAtTime((100 - this.value)/100, audioContext.currentTime);
                wetNode.gain.setValueAtTime(this.value/100, audioContext.currentTime);
            });

            document.getElementById('sens-value').addEventListener('input', function () {
                sens = this.value/100;
            }); 

            setInterval(function () {
                if (audioContext.state !== 'suspended') {
                    var dataArray = new Uint8Array(analyserNode.frequencyBinCount);

                    analyserNode.getByteTimeDomainData(dataArray);

                    var rms = Math.sqrt(
                        dataArray.reduce(function (acc, val) {
                            return acc + Math.pow((val - 128) / 128, 2);
                        }, 0) / dataArray.length
                    );
                    newFreq = rms * freq / MIN_RMS * sens;
                    filterNode.frequency.setValueAtTime(newFreq, audioContext.currentTime);
                }
            }, 10);
        }).catch((error) => {
            console.error('Error al obtener el stream:', error);

            return null;
        });
    } else {
        if (audioContext != null) {
            audioContext.suspend();
        }
    }
}
