// BEGIN GUI
var cons = document.getElementById('con1');
var stats = document.getElementById('stats');
var con2 = document.getElementById('con2');
var stopped = true;
var loaded = false;
var wait = false;
//Screen Fade
var BlackOut = function () {
	$(".con2").fadeOut(200);
};
//FadeIn
var ShowTime = function () {
	$(".con2").fadeIn(300);
};
//DEAD STATE
var taxiDie = function () {
	$(".transaction").html("<span class='black'>Day " + day + "</span><br><span style='font-size:20px'><br><br><br>Food for " + food + " days. <span class='red'>You died!</span><span>").delay(20).fadeIn().delay(8000).fadeOut();
};
// END GUI
// START INITIAL GAME VARIABLE DECLARATION
var alive = true;
var health = 100;
var wealth = 800;
var food = 4;
var currentDate = new Date(2009, 4, 11, 7);
var day = 1;
var Step = 18;
//GAME SOUND // Individual sounds are specified here. Sounds included inside one ogg file.
var sound = new Howl({
	urls: ['aud/sounds.ogg'],
	sprite: {
		door: [0, 730],
		honk: [2180, 1220],
		eat: [6540, 2570],
		sleep: [10900, 4360],
		cash: [4360, 680],
		stop: [26720, 2180],
		wrong: [29450, 410],
		zoom: [32720, 1640],
		jump: [34900, 130],
		leave: [33270, 1090],
		start: [37090, 2180],
		drive: [17450, 4360, {
			loop: true
		}]
	}
});
// GAME LOOP WILL STOP WHEN FALSE
var loop = function () {
	setInterval(function () {
		if (stopped === false) {
			addMinutes(Step);
		}
	}, 1000);
};
// report
report = function () {
	$(".transaction").html("<span class='black'>Day " + day + "</span><br><span>"+currentDate.getHours()+" hours.</span><p class='subInfo'>Food: " +food +" days. <span class='red'>Cash: L."+wealth+"</span><p>").delay(20).fadeIn().delay(8000).fadeOut();
};
//GAME TIME FUNCTIONS
nextDay = function (days) {
	if (currentDate.getHours() > 14 && alive === true) {
	    BlackOut();
		StopTaxi();
		currentDate.setDate(currentDate.getDate() + days);
		currentDate.setHours(7);
		sound.play('sleep');
		food -= 0.5;
		wealth -= 100;
		health = 99;
		day = day + 1;
	    $(".taxiFull").fadeOut(0);
		loaded = false;
		$(".background2").css('right', '-60px');
		//Show 3 seconds later
		setTimeout(function () {
			ShowTime();
			report();
		}, 3000);
		
	} else if (currentDate.getHours() === 11 && alive === true) {
		StopTaxi();
		$(".transaction").html("<span class='red'>Almuerzo</span>").delay(2).fadeIn().delay(1800).fadeOut();
		// Play eat sound
		sound.play('eat');
		addMinutes(60);
		food -= 0.5;
		$(".taxiFull").fadeOut(300);
		loaded = false;
		//Show 3 seconds later
		setTimeout(function () {
			ShowTime();
		    report();
		}, 3500);

	}
};
// Loop
var addMinutes = function (minutesAdd) {
	currentDate.setMinutes(currentDate.getMinutes() + minutesAdd);
	nextDay(1);
	check();
};
// CLEAR CONSOLE, REPORT, YES AND NO TEST
var type = function (message) {
	//cons.innerHTML = "<p>" + message + "</p>" + cons.innerHTML;
};
// START INITIAL FUNCTION DECLARATION
document.addEventListener("contextmenu", hideMenu, false);

function hideMenu(e) {
	e.preventDefault();
}
ShowTime();
sound.play('sleep');
var check = function () {
	if (health < 1 || food < 1 || wealth < 1) {
		alive = false;
		health = 0;
	}
	if (alive === false) {
		for (Step === 18; Step > 0; Step = Step - 18) {
			if (health < 1) {
				type("Ultimately, your poor mental and physical health have caused your body to fail. You survived for " + day + " days.");
			}
			if (food < 1) {
				type("You were unable to feed yourself and have died of starvation. You survived for " + day + " days.");
			}
			taxiDie();
		}
	}
};
//On Click of Passenger
var passengerClick = function () {
	// If the taxi is unoccupied and not waiting for customers. Will load passenger.
	var dist2cab = parseInt(parseInt($(this).css("right")) * 1.1 - 50);
	if (loaded === false && alive === true && wait === false && dist2cab < 1300) {
		wait = true;
		// Play honk sound
		if (stopped === false) StopTaxi();
		sound.play('zoom');
		//Passenger runs and enters taxi after jumping.
		$(this).animate({
			bottom: "+=20px"
		}, {
			duration: 110
		}).animate({
			bottom: "-=20px"
		}, {
			duration: 100
		}).animate({
			bottom: "+=16px"
		}, {
			duration: 150
		}).animate({
			bottom: "-=16px"
		}, {
			duration: 100
		});
		$(this).animate({
			right: "50px"
		}, {
			duration: dist2cab
		}).animate({
			bottom: "-=15px"
		}, {
			duration: 200
		}).fadeOut().animate({
			bottom: "+=15px"
		}, {
			duration: 1
		}).animate({
			right: "-200px"
		}, {
			duration: 1
		});
		$(".taxiFull").delay(dist2cab + 780).fadeIn();
		setTimeout(function () {
			wait = false;
			loaded = true;
			// type("You picked up a customer!");
			// Play door sound
			sound.play('door');
		}, dist2cab + 800);
		// What to do when taxi is occupied and passenger clicked on.
	} else if (loaded === true && alive === true) {
		// if the cab is stopped and occupied
		if (stopped === true) {
			$(this).animate({
				bottom: "+=20px"
			}, {
				duration: 110
			}).animate({
				bottom: "-=20px"
			}, {
				duration: 100
			});
			// if the cab is occupied but not stopped
		} else {
			$(this).stop().animate({
				bottom: "110px",
				right: "-=23"
			}, {
				duration: 110,
				easing: "linear"
			}).animate({
				bottom: "90px",
				right: "-=22"
			}, {
				duration: 100,
				easing: "linear"
			}).animate({
				right: "-=20000px"
			}, {
				duration: 100000,
				easing: "linear"
			});
		}
		//Message if cab is occupied and player attempts to load another passenger.
		// type("You seem to have a passenger. Take the passenger to their destination before accepting any new clients.");
		// Play wrong sound
		sound.play('jump').play('wrong');
		// What to do if taxi is clicked  vacant and not waiting for customers. If driving or stopped.
	} else if (loaded === false && alive === true && wait === false) {
		if (stopped === false) {
			$(this).stop().animate({
				bottom: "+=20px",
				right: "-=23"
			}, {
				duration: 110,
				easing: "linear"
			}).animate({
				bottom: "-=20px",
				right: "-=22"
			}, {
				duration: 100,
				easing: "linear"
			}).animate({
				right: "-=20000px"
			}, {
				duration: 100000,
				easing: "linear"
			});
		} else {
			$(this).animate({
				bottom: "+=20px"
			}, {
				duration: 110,
				easing: "linear"
			}).animate({
				bottom: "-=20px"
			}, {
				duration: 100,
				easing: "linear"
			});
		}
		type("Try parking your taxi closer to the customer.");
		sound.play('wrong');
	}
};
$(".rider").mousedown(passengerClick);
//On Click on Taxi
taxiClick = function () {
	if (wait === true) {
		// type("Be polite and wait for your client to enter the cab!");
		// Play jump and wrong sound
		sound.play('wrong');
	}
	if (stopped === true && wait === false && alive === true) {
		GoTaxi();
		// Function to drop off Passenger // Passenger drop       
	} else if (loaded === true && stopped === false && wait === false && alive === true) {
		wait = true;
		StopTaxi();
		$(".taxiFull").fadeOut();
		sound.play('cash');
		setTimeout(function () {
			loaded = false;
			wealth += 70;
			$(".transaction").html("<span class='green'>L.70</span>").fadeIn().delay(200).fadeOut();
			setTimeout(function () {
				$(".transaction").html("<span class='black'>L." + wealth + "</span>").fadeIn().delay(200).fadeOut();
			}, 1600);
			wait = false;
			$(".passengerDrop").fadeOut(0).delay(200).css("right", "50px").css("bottom", "-=15px").fadeIn().animate({
				bottom: "+=15px"
			}, {
				duration: 200
			}).animate({
				right: "-=400px"
			}, {
				duration: 800
			}).stop();
			// type("You dropped off a customer!");
			// Play door sound
			sound.play('door');
		}, 600);
		setTimeout(function () {
			sound.play('leave');
		}, 1200);
	} else if (stopped === false && wait === false && alive === true) {
		StopTaxi();
	}
};
$(".taxi").mousedown(taxiClick);
// Function to move the pedestrians and relocate them after they pass the cab
var goLive = function () {
	for (var pedestrians = 5; pedestrians >= 0; pedestrians--) {
		if (parseInt($(".passenger" + [pedestrians]).css("right")) > -100 && stopped === false) {
			$(".passenger" + [pedestrians]).animate({
				right: "-=20000px"
			}, {
				duration: 100000,
				easing: "linear"
			});
		} else if (stopped === false) {
			$(".passenger" + [pedestrians]).css("right", Math.ceil(Math.random() * 100) * 50 + 1800 + "px").fadeIn(0).animate({
				right: "-=20000px"
			}, {
				duration: 100000,
				easing: "linear"
			});
		}
	}
};
//Function to make the taxi Go! Repositions buildings and pedestrians and gives the illusion  of movement.
var GoTaxi = function () {
	if (stopped === true) $(".taxi").removeClass("stop").stop().addClass("drive"); //Animates cab on drive
	stopped = false;
	$(".background2").stop().animate({
		right: "-=" + parseInt(225000 / 2.01, 10)
	}, 1000000, "linear");
	var cubeArray = ['.storeCube', '.officeCube']; //Reposition buildings
	for (var i = cubeArray.length - 1; i >= 0; i--) {
		if (parseInt($(cubeArray[i]).css("right")) < -1500) $(cubeArray[i]).stop().css("right", Math.ceil((Math.random() + Math.random()) * 20) * 300 + 2400 + "px");
	}
	cubeMove("-=" + 20000 * 1.17 + "px", 100000); //Animates Buildings
	goLive(); // Repositions and animates Pedestrians
	sound.stop().play('start').play('drive'); //play driving sounds
};
//When the taxi stops.
var StopTaxi = function () {
	$(".taxi").removeClass("drive").stop().addClass("stop"); // $(".taxi").stop().animate({bottom:"84px"}, 500);
	if (stopped === false) { // stops pedestrians, buildings and road from moving
		$(".background2").stop(true).animate({
			right: "-=" + parseInt(112.5 / 2.01, 10)
		}, 500, "linear");
		$(".rider").stop().fadeIn(0).animate({
			right: "-=100px"
		}, {
			duration: 500,
			queue: false,
			easing: "linear"
		});
		$(".cubes").stop(true);
		cubeMove("-=" + 100 * 1.17 + "px", 500);
		stopped = true;
		sound.stop().stop().play('stop');
	}
	if (stopped === true && loaded === false && parseInt($(".storeCube").css("right")) > 5 && parseInt($(".storeCube").css("right")) < 480 && wealth > 200 && food < 15) { // Buying food at the store
		$(".transaction").html("<span class='red'>L.200</span>").fadeIn().delay(200).fadeOut();
		food++;
		food++;
		wealth -= 200;
		// type("You bought some food at the store.");
		sound.play('cash').play('eat');
		setTimeout(function () {
			$(".transaction").html("<span class='black'>L." + wealth + "</span>").fadeIn().delay(200).fadeOut();
		}, 1600);
	} else if (wealth < 200) {
		type("You don't have enough wealth to buy food.");
	} else if (food > 14) {
		type("You have too much food!");
	}
};
var cubeMove = function (pixels, duration) {
	$(".cubes").animate({
		right: pixels
	}, duration, "linear");
};
// END INITIAL FUNCTION DECLARATION
// START COMMANDS
// clearConsole();
// report();
$(".taxiFull").fadeOut(1);
$(".passengerDrop").fadeOut(1);
// STORY
report();
loop();
