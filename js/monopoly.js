var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 40;
Monopoly.doubleCounter = 0;
Monopoly.lastWasDouble = false;
Monopoly.dontClosePopUp = false;
Monopoly.playerBeforeBankrupt = false;
Monopoly.BankruptPlayer="";

Monopoly.init = function(){ // initalize board
    $(document).ready(function(){
        Monopoly.adjustBoardSize();
        $(window).bind("resize",Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
    });
};

Monopoly.start = function(){ // show the intro
    Monopoly.showPopup("intro")
};


Monopoly.initDice = function(){ // create dice
    $(".dice").click(function(){
        if (Monopoly.allowRoll){
            Monopoly.rollDice(); // roll the dice
        }
    });
};


Monopoly.getCurrentPlayer = function(){ // get the current player
    return $(".player.current-turn");
};

Monopoly.getPlayersCell = function(player){ // find the players cell
    return player.closest(".cell");
};


Monopoly.getPlayersMoney = function(player){
    return parseInt(player.attr("data-money"));
};

Monopoly.updatePlayersMoney = function(player,amount){
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney <0 ){
        Monopoly.handleBankruptcy(player);
        }

    player.attr("data-money",playersMoney);
    player.attr("title",player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");
};


Monopoly.rollDice = function(){
    var result1 = Math.floor(Math.random() * 6) + 1 ; // dice 1
    var result2 = Math.floor(Math.random() * 6) + 1 ; // dice
    $(".dice").find(".dice-dot").css("opacity",0);
    $(".dice#dice1").attr("data-num",result1).find(".dice-dot.num" + result1).css("opacity",1);
    $(".dice#dice2").attr("data-num",result2).find(".dice-dot.num" + result2).css("opacity",1);
    if (result1 == result2){
        Monopoly.doubleCounter++; // player rolled doubles.
        Monopoly.lastWasDouble = true;
    }
    else{
        Monopoly.lastWasDouble = false;
    }
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer,"move",result1 + result2);
};


Monopoly.movePlayer = function(player,steps){

        Monopoly.allowRoll = false;
        var playerMovementInterval = setInterval(function(){
            if (steps == 0){
                clearInterval(playerMovementInterval);
                Monopoly.handleTurn(player);
            }else{
                var playerCell = Monopoly.getPlayersCell(player);
                var nextCell = Monopoly.getNextCell(playerCell);
                nextCell.find(".content").append(player);
                steps--;
            }
        },200);



};


Monopoly.handleTurn = function(){
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    player.removeClass("onOwnProp");

    if(playerCell.is(".property:not(.available)") && playerCell.hasClass(player.attr("id"))){
        player.addClass("onOwnProp");
    }

    if (playerCell.is(".available.property")){
        Monopoly.handleBuyProperty(player,playerCell);

    }else if(playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))){
        Monopoly.handlePayRent(player,playerCell);
    }else if(playerCell.is(".go-to-jail")){
        Monopoly.handleGoToJail(player);
    }else if(playerCell.is(".chance")){
        Monopoly.handleChanceCard(player);
    }else if(playerCell.is(".community")){
        Monopoly.handleCommunityCard(player);
    }
    else{
        Monopoly.setNextPlayerTurn();
    }
}

Monopoly.handleBankruptcy = function(player){ // if a player has less than 0 he is banktupt 

    Monopoly.playerBeforeBankrupt = true;
    Monopoly.BankruptPlayer = player;

    Monopoly.dontClosePopUp = true;

    var popup = Monopoly.getPopup("broke");

    popup.find("button").unbind("click").bind("click",function(){

        Monopoly.closePopup("broke");
        Monopoly.dontClosePopUp = false;

    });

    Monopoly.showPopup("broke");

    var selectPlayer = "." + player.attr("id");
    var selectOwner = "[data-owner=" + "'" + player.attr("id") + "']";

    $(selectPlayer).addClass('available');
    $(selectPlayer).removeClass(player.attr("id"));
    $(selectOwner).removeAttr("data-rent");
    $(selectOwner).removeAttr("data-owner");

    player.remove();

};

Monopoly.setNextPlayerTurn = function(){

    if(Monopoly.playerBeforeBankrupt){
        var currentPlayerTurn = Monopoly.BankruptPlayer;
        Monopoly.BankruptPlayer="";
        Monopoly.playerBeforeBankrupt = false;
    }

    else{
        var currentPlayerTurn = Monopoly.getCurrentPlayer();
    }

    var playerId = parseInt(currentPlayerTurn.attr("id").replace("player",""));

    if (Monopoly.lastWasDouble){
        var nextPlayerId = playerId;
    }
    else{
        var nextPlayerId = playerId + 1;
    }

    if (nextPlayerId > $(".player").length){
        nextPlayerId = 1;
    }
    currentPlayerTurn.removeClass("current-turn");
    var nextPlayer = $(".player#player" + nextPlayerId);
    nextPlayer.addClass("current-turn");
    if (nextPlayer.is(".jailed")){
        var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
        currentJailTime++;
        nextPlayer.attr("data-jail-time",currentJailTime);
        if (currentJailTime > 3){
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time");
        }
        Monopoly.setNextPlayerTurn();
        return;
    }

    if (Monopoly.dontClosePopUp===false){
        Monopoly.closePopup();
    }

    Monopoly.allowRoll = true;
};


Monopoly.handleBuyProperty = function(player,propertyCell){
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click",function(){
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")){
            Monopoly.handleBuy(player,propertyCell,propertyCost);
        }else{
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};

Monopoly.handlePayRent = function(player,propertyCell){
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click",function(){
        var properyOwner = $(".player#"+ properyOwnerId);

        Monopoly.updatePlayersMoney(player,currentRent);
        Monopoly.updatePlayersMoney(properyOwner,-1*currentRent);
        Monopoly.closeAndNextTurn();
    });
    Monopoly.showPopup("pay");
};


Monopoly.handleGoToJail = function(player){
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click",function(){
        Monopoly.handleAction(player,"jail");
    });
    Monopoly.showPopup("jail");
};


Monopoly.handleChanceCard = function(player){ // retrieves a chance card via ajax
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function(chanceJson){
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",chanceJson["action"]).attr("data-amount",chanceJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("chance");
};

Monopoly.handleCommunityCard = function(player){
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function(communityJson){
        popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
        popup.find(".popup-title").text(communityJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",communityJson["action"]).attr("data-amount",communityJson["amount"]);
    },"json");

    popup.find("button").unbind("click").bind("click",function(){

        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");

        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("community");

};


Monopoly.sendToJail = function(player){ // sends player to jail
    player.addClass("jailed");
    player.attr("data-jail-time",1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};


Monopoly.getPopup = function(popupId){ // get the popup based on the id fed in
    return $(".popup-lightbox .popup-page#" + popupId);
};

Monopoly.calculateProperyCost = function(propertyCell){
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group","")) * 5;
    if (cellGroup == "rail"){
        cellPrice = 10;
    }
    return cellPrice;
};


Monopoly.calculateProperyRent = function(propertyCost){ // rent cost is half of the property cost
    return propertyCost/2;
};


Monopoly.closeAndNextTurn = function(){ // go to the next players turn
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

Monopoly.initPopups = function(){
    $(".popup-page#intro").find("button").click(function(){
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers",numOfPlayers)){ // check if input is valid.
            Monopoly.createPlayers(numOfPlayers); // create players
            Monopoly.closePopup();
        }
    });
};


Monopoly.handleBuy = function(player,propertyCell,propertyCost){
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost){ // dont allow player to buy property if he doesnt have enough money
        Monopoly.showErrorMsg();
        Monopoly.playSound("nomoney");
    }else{
        Monopoly.updatePlayersMoney(player,propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);

        propertyCell.removeClass("available")
        .addClass(player.attr("id"))
        .attr("data-owner",player.attr("id"))
        .attr("data-rent",rent);

        player.addClass("onOwnProp");
        Monopoly.setNextPlayerTurn();
    }
};

Monopoly.handleAction = function(player,action,amount){ // hande different actions

    switch(action){
        case "move":
        player.removeClass("onOwnProp");

        Monopoly.movePlayer(player,amount);
        break;
        case "pay":
        Monopoly.updatePlayersMoney(player,amount);
        Monopoly.setNextPlayerTurn();
        break;
        case "jail":
        Monopoly.sendToJail(player);
        break;
    };
    Monopoly.closePopup();
};


Monopoly.createPlayers = function(numOfPlayers){ // create number of players
    var startCell = $(".go");
    for (var i=1; i<= numOfPlayers; i++){
        var player = $("<div />").addClass("player shadowed").attr("id","player" + i).attr("title","player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i==1){
            player.addClass("current-turn");
        }
        player.attr("data-money",Monopoly.moneyAtStart);
    }
};


Monopoly.getNextCell = function(cell){

    var currentCellId = parseInt(cell.attr("id").replace("cell",""));


    var nextCellId = currentCellId + 1
    if (nextCellId > 40){

        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};


Monopoly.handlePassedGo = function(){
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player,Monopoly.moneyAtStart/10 *-1);
};


Monopoly.isValidInput = function(validate,value){
    var isValid = false;
    switch(validate){
        case "numofplayers":
        if(value >= 1 && value <= 4){ // can play with 1-4 players
            isValid = true;
        }
        break;
    }

    if (!isValid){
        Monopoly.showErrorMsg();
    }
    return isValid;

}

Monopoly.showErrorMsg = function(){
    $(".popup-page .invalid-error").fadeTo(500,1);
    setTimeout(function(){
        $(".popup-page .invalid-error").fadeTo(500,0);
    },2000);
};


Monopoly.adjustBoardSize = function(){
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(),$(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) *2;
    $(".board").css({"height":boardSize,"width":boardSize});
}

Monopoly.closePopup = function(){
    $(".popup-lightbox").fadeOut();
};

Monopoly.playSound = function(sound){
    var snd = new Audio("./sounds/" + sound + ".wav");
    snd.play();
}

Monopoly.showPopup = function(popupId){ // show popups
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};

Monopoly.init();
