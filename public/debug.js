const ws = new WebSocket(`ws://${window.location.host}/play`);
let GAME_PHASE = '';
const send = (payload) => ws.send(JSON.stringify(payload));
const getel = (id) => document.getElementById(id);
ws.onmessage = (event) => { 
  msg = JSON.parse(event.data);
  if (msg.msg_type !== 'pong') { console.log(msg) }

  if (msg.msg_type === 'game_state') {
    GAME_PHASE = msg.game.phase;
    gameState = '<br>Game:          ' + msg.table_id + '<br>' +
      'Players:       ' + msg.game.players + '<br>' +
      'Spectators:    ' + msg.game.spectators + '<br>' +
      'Game Phase:  '   + msg.game.phase + '<br>' +
      'Player Turn:  '   + msg.game.turn + '<br>' +
      'Dealer:  '   + msg.game.dealer + '<br>' +
      'Trump:  '   + msg.game.trump + '<br>' +
      'Tricks:  '   + msg.game.tricks + '<br>' +
      'Hand Lengths:  '   + msg.game.hand_lengths + '<br>' +
      'Score:  '   + msg.game.score + '<br>'

    if (typeof msg.game.trump_nominee !== 'undefined') {
      gameState += 'Trump Nominee: ' + '<img class="card" src="cards/' + msg.game.trump_nominee + '.svg"><br>'
    }

    getel('hand').innerHTML = 'HAND: <br>'
    if (msg.hand) {
      for (let i = 0; i < msg.hand.length; i++) {
        const c = msg.hand[i]
        getel('hand').innerHTML += '<img onclick="play(' + "'" +  c + "'" + ')" class="card" src="cards/' + c + '.svg">'
      }
    }

    if (msg.game.table) {
      getel('table').innerHTML = ''
      for (let i = 0; i < msg.game.table.length; i++) {
        let c = msg.game.table[i]
        if (c === null) {
          c = '2B' // show back
        }
        getel('table').innerHTML += '<img class="card" src="cards/' + c + '.svg">'
      }
    } else {
      getel('table').innerHTML = 'No cards on table'
    }
    getel('game').innerHTML = gameState
  } else if (msg.msg_type === 'error') {
    getel('error').innerHTML += msg.msg + '<br>'
  } else if (msg.msg_type === 'chat') {
    getel('chat_box').innerHTML += msg.msg + '<br>'
  }
};

function joinGame() {
  uname = getel('username')?.value ?? "Anon";
  gname = getel('gamename').value;
  pass  = getel('password')?.value ?? "";
  console.log('U: ' + uname + ' G: ' + gname);
  send({action:'join_table', player_name: uname, table: gname, password: pass})
}
function sit() {
  seat = getel('seat_no').value;
  send({action:'take_seat', seat: seat})
}
function stand() {
  send({action:'stand_up'})
}
function start_game() {
  seat = getel('start_seat').value;
  send({action:'start_game', start_seat: seat})
}
function vote(a) {
  order_suit = getel('order_suit').value;
  console.log(order_suit);
  send({action:'order', vote: order_suit, loner: a})
}
function pass_kitty() {
  send({action:'order', vote: 'pass'})
}
function play(card) {
  if (GAME_PHASE === 'dealer_swap') {
    send({action:'dealer_swap', card: card})
  } else {
    send({action:'play_card', card: card})
  }
}
function chat() {
  send({action:'chat', msg: getel('chat').value })
  getel('chat').value = '';
}
function leaveGame() {
  send({action:'leave_table'})
}

window.setInterval(() => { send({action:'ping'}) }, 5000);

