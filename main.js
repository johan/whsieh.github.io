$(function() {
    // For convenience.
    var sin = Math.sin
        , cos = Math.cos
        , pow = Math.pow
        , abs = Math.abs
        , PI = Math.PI;

    // Stores the viewport dimensions.
    var sceneWidth = window.innerWidth,
        sceneHeight = 0.8 * window.innerHeight;

    // Stores variables for initializing the cube.
    var forwardTiltAngle = PI / 6;
    var initialRotationAmountY = PI * 4;
    var loadedTexturesCount = 0;
    var totalTexturesCount = 6;

    // Used to track the current animation state.
    var isAnimationActive = false;
    var shouldRotateCube = false;
    var shouldZoomCube = false;
    var rotationReachedCallback;
    var targetRotationVector = new THREE.Vector3(0, 0, 0);
    var initialRotationVector = new THREE.Vector3(0, 0, 0);
    var targetZoomDistance = 0
    var initialZoomDistance = 0

    // Stores key rotation angles and distances for each state.
    var rotationAngles = {
        "#about-control": {
            "hover": new THREE.Vector3(forwardTiltAngle, 0, 0),
            "zoomed": new THREE.Vector3(0, 0, 0)
        },
        "#contact-control": {
            "hover": new THREE.Vector3(forwardTiltAngle + PI / 2, 0, 0),
            "zoomed": new THREE.Vector3(PI / 2, 0, 0)
        },
        "#projects-control": {
            "hover": new THREE.Vector3(forwardTiltAngle, PI / 2, 0),
            "zoomed": new THREE.Vector3(0, PI / 2, 0)
        },
        "#resume-control": {
            "hover": new THREE.Vector3(forwardTiltAngle - PI / 2, 0, 0),
            "zoomed": new THREE.Vector3(-PI / 2, 0, 0)
        }
    }
    var closeZDistance = 12;
    var farZDistance = 0;

    // Tracks UI state.
    var isInZoomedMode = false;
    var selectedFaceId = "#about-control";

    // Three.js objects.
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, sceneWidth / sceneHeight, 0.1, 1000);
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(sceneWidth, sceneHeight);
    renderer.setClearColor(0xFFFFFF, 1);
    var viewBox = renderer.domElement;
    document.body.appendChild(viewBox);
    renderer.domElement.id = "viewBox";

    var zoomToDistance = function(targetZoom, animationComplete) {
        shouldZoomCube = cube.position.z != targetZoom;
        if (shouldZoomCube) {
            initialZoomDistance = cube.position.z;
            targetZoomDistance = targetZoom;
            zoomReachedCallback = animationComplete;
            beginAnimation();
        }
    }

    var rotateToEulerAngles = function(targetX, targetY, targetZ, animationComplete) {
        shouldRotateCube = cube.rotation.x != targetX || cube.rotation.y != targetY || cube.rotation.z != targetZ;
        if (shouldRotateCube) {
            initialRotationVector = new THREE.Vector3(cube.rotation.x, cube.rotation.y, cube.rotation.z);
            targetRotationVector = new THREE.Vector3(targetX, targetY, targetZ);
            rotationReachedCallback = animationComplete;
            beginAnimation();
        }
    }

    var incrementTextureCountOnTextureLoad = function() {
        loadedTexturesCount++;
        if (loadedTexturesCount == totalTexturesCount) {
            didFinishLoadingTextures()
        }
    }

    /**
     * Fade the viewBox in while running the initial "spinning"
     * animation sequence.
     */
    var didFinishLoadingTextures = function() {
        // Initial rendering sequence
        $("#viewBox").animate({ opacity: 1 }, 400);
        rotateToEulerAngles(forwardTiltAngle, initialRotationAmountY, 0, function() {
            $("#navigationPanel").animate({opacity: 0.7}, 200, function() {
                for (var controlElementId in rotationAngles) {
                    $(controlElementId).hover(function(event) {
                        if (!isInZoomedMode) {
                            var elementId = "#" + event.target.id;
                            var angles = rotationAngles[elementId];
                            rotateToEulerAngles(angles["hover"].x, angles["hover"].y, angles["hover"].z);
                            $(elementId).css({opacity: 1});
                        }
                    }, function(event) {
                        if (!isInZoomedMode) {
                            var elementId = "#" + event.target.id;
                            $(elementId).css({opacity: 0.7});
                        }
                    })
                    $(controlElementId).click(function(event) {
                        var elementId = "#" + event.target.id;
                        selectedFaceId = elementId;
                        $(elementId).css({opacity: 0.7});
                        var angles = rotationAngles[elementId];
                        rotateToEulerAngles(angles["zoomed"].x, angles["zoomed"].y, angles["zoomed"].z);
                        zoomToDistance(closeZDistance);
                        $("#viewBox").animate({opacity: 0.1}, 500);
                        $("#navigationControls").animate({top: "100%", opacity: 0}, 250, function() {
                            $("#zoomedControls").animate({top: "40%", opacity: 1}, 250, function() {
                                isInZoomedMode = true;
                            });
                        });
                    });
                }
                $("#back-control").hover(function() {
                    $("#back-control").css({opacity: 1});
                }, function() {
                    $("#back-control").css({opacity: 0.7});
                });
                $("#back-control").click(function() {
                    var angles = rotationAngles[selectedFaceId];
                    rotateToEulerAngles(angles["hover"].x, angles["hover"].y, angles["hover"].z);
                    zoomToDistance(farZDistance);
                    $("#viewBox").animate({opacity: 1}, 500);
                    $("#zoomedControls").animate({top: "100%", opacity: 0}, 250, function() {
                        $("#navigationControls").animate({top: "0%", opacity: 1}, 250, function() {
                            isInZoomedMode = false;
                        });
                    });
                });
            });
        });
    }

    var faceMaterials = [
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture("face_graph.png", null, incrementTextureCountOnTextureLoad),
            transparent: true
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture("face_projects.png", null, incrementTextureCountOnTextureLoad),
            transparent: true
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture("face_contact.png", null, incrementTextureCountOnTextureLoad),
            transparent: true
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture("face_resume.png", null, incrementTextureCountOnTextureLoad),
            transparent: true
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture("face_whsieh.png", null, incrementTextureCountOnTextureLoad),
            transparent: true
        }),
        new THREE.MeshLambertMaterial({
            map: THREE.ImageUtils.loadTexture("face_empty.png", null, incrementTextureCountOnTextureLoad),
            transparent: true
        })
    ];

    var cube = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshFaceMaterial(faceMaterials));
    scene.add(cube);
    var ambientLight = new THREE.AmbientLight(0xFFFFFF);
    scene.add(ambientLight);
    camera.position.z = 20;

    var beginAnimation = function() {
        if (isAnimationActive) {
           console.log("Animation already in progress!");
           return
        }
        console.log("Beginning animation...");
        isAnimationActive = true;
        animate();
    }

    var endAnimation = function() {
        console.log("Ending animation...");
        isAnimationActive = false;
    }

    var updateZoom = function() {
        if (!shouldZoomCube) {
            if (!shouldRotateCube)
                endAnimation();

            return;
        }
        if (abs(targetZoomDistance - cube.position.z) < 0.0025) {
            cube.position.z = targetZoomDistance;
            if (zoomReachedCallback)
                zoomReachedCallback();

            shouldZoomCube = false;
            zoomReachedCallback = null;
        } else {
            cube.position.z += 0.15 * (targetZoomDistance - cube.position.z)
        }
    }

    var updateRotations = function() {
        if (!shouldRotateCube) {
            if (!shouldZoomCube)
                endAnimation();

            return;
        }
        if (pow(targetRotationVector.x - cube.rotation.x, 2) + pow(targetRotationVector.y - cube.rotation.y, 2) + pow(targetRotationVector.z - cube.rotation.z, 2) < 0.00005) {
            cube.rotation.x = renormalizeAngle(targetRotationVector.x);
            cube.rotation.y = renormalizeAngle(targetRotationVector.y);
            cube.rotation.z = renormalizeAngle(targetRotationVector.z);
            if (rotationReachedCallback)
                rotationReachedCallback();

            shouldRotateCube = false;
            rotationReachedCallback = null;
        } else {
            cube.rotation.x += 0.1 * (targetRotationVector.x - cube.rotation.x);
            cube.rotation.y += 0.1 * (targetRotationVector.y - cube.rotation.y);
            cube.rotation.z += 0.1 * (targetRotationVector.z - cube.rotation.z);
        }
    }

    var renormalizeAngle = function(theta) {
        while (theta > PI)
            theta -= 2*PI;

        while (theta < -PI)
            theta += 2*PI;

        return theta;
    }

    var vector3AsString = function(v) {
        return "<" + v.x + "," + v.y + "," + v.z + ">";
    }

    var animate = function() {
        updateRotations();
        updateZoom();
        renderer.render(scene, camera);
        if (isAnimationActive)
            requestAnimationFrame(animate);
    }

    window.onresize = function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
