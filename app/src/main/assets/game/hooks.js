var gradle = { log: function(val){val && console.log( gradle.isMobile && (typeof val === 'object') ? JSON.stringify(val) : val );},
/**
	GRADLE - KNOWLEDGE IS POWER
	***** JACOB SERVICES LLC ***
    ***** PROPRIETARY CODE *****
    @author : gradle (gradlecode@outlook.com)
	@date: 04/17/2022 14:43:00
	@version: 7.0.0
	copyright @2021
*/
	
	intervalAds    : 3,     //Ads each interval for example each 3 times
    
	strings : [
            "CREDITS",
            "Created By :",
            "Gradle Code",
            " ",
            "2021",
            "A great game with multiple levels",
            " ",
            " ",
            "RESCUE MAN",
            "",
            " ",
            "",
            "",
            " ",
            "GRADLE CODE (gradlecode@outlook.com)",
        ],
	
	//Events manager :
	//================
    event: function(ev, msg){
		if(gradle.process(ev,msg))
        switch(ev){

		case 'first_start':   //First start
			//gradle.showInter();
			break;

		case 'btn_play':   //Button Play
            //gradle.showInter();
			break;
		
		case 'next_level':   //Button next level
            gradle.showInter();
			break;
			
		case 'btn_restart':  //button Retry
			//gradle.checkInterval() && gradle.showInter();
			break;
		
		case 'grame_over': //btn home on the dialog game over
			//gradle.showInter();
			break;
			
		case 'test':
			//gradle.checkInterval() && gradle.showInter();
			break;
		
        }
    },





    //Ready : /!\ DO NOT CHANGE, ONLY IF YOU ARE AN EXPERT.
    //=========================
	start: function(){
        //setTimeout(function(){sizeHandler();gradle.event_ext('hide_splash');}, 600);
    },
	pause: function(){
		console.log('gradle pause ...');
    },
	resume: function(){
		console.log('gradle resume ...');
    },

    run: function() {
        gradle.event('first_start');
		gradle.isMobile = ( /(ipad|iphone|ipod|android|windows phone)/i.test(navigator.userAgent) );
        document.addEventListener("visibilitychange", gradle.onVisibilityChanged, false);
		gradle.start();
    },

	mute: false,
    event_ext: function(val){
		if(this.isMobile && typeof jacob!='undefined'){
			jacob.do_event(val);
		}
	},

	old_ev: null,
    process: function(ev, msg){
		if(gradle.old_ev ==ev){
			if(ev=='button_share' || ev=='button_play'){
				console.log('repeat');
				//return false;
			}
		}
        if(ev=='state_game_create'){
			null != game && (game.sound.mute = !1, game.paused = !1);
			//this.triggerEvent(document.getElementById('game'), 'click');
		}
		switch(ev){
            case 'btn_more':
                gradle.event_ext('show_more');
                break;
            case 'btn_privacy':
                gradle.event_ext('show_privacy');
                break;
            case 'btn_share':
                gradle.event_ext('show_share');
                break;
            case 'btn_profile':
                gradle.event_ext('show_profile');
                break;
            case 'btn_exit_game':
                gradle.event_ext('exit_game');
                break;
        }
		gradle.old_ev = ev;
		gradle.log(ev,msg);
		return true;
    },

    showInter: function(){
        if(!gradle.isMobile) return;
        gradle.log('jacob|show_inter');
    },
	
	score : 0,
    save_score(score, level){
        gradle.event_ext('save_score|'+score+'|'+level);
    },

	onVisibilityChanged : function(){
	    if (document.hidden || document.mozHidden || document.webkitHidden || document.msHidden){
			gradle.pause();
		}else{
			gradle.resume();
		}
	},

	currentInterval : 0,
	checkInterval: function(){
		return (++gradle.currentInterval==gradle.intervalAds) ? !(gradle.currentInterval=0) : !1;
	}
};
gradle.run();
