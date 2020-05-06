API Reference
=============

Interaction with the server is 100% done through websockets at the following
endpoint:

    ws://HOST:PORT/play

Client Actions
--------------
Each message from a client should have the "action" key with one of the
following values, along with additional info as needed.

For example, `ping` would be `{ "action": "ping" }`.

### Actions Outside a Table

#### `ping`

Tells the server you're still alive (15s without any message will result in
being booted from the game).

Response will be `{ "msg_type": "pong" }`.

#### `join_table`

Properties:
- `table`: Required, table name to join (i.e. "Party")
- `player_name`: Required, display name for table
- `password`: Optional, password for table

First player to join creates the table (with a password, if givin).
Additional players are required to provide that password.

`table` + `player_name` must be a unique combo on the server.

Gamestate will be broadcasted to all players on success.

#### `leave_table`

Remove player from table (standing up out of seat if necessary).
Hand is managed by game, so this is OK to call without destroying the
game state.

No response on success.

#### `list_tables`

WIP to enable a table discovery frontend. More info coming.


### In-Game Messages

Same as before, requiring the "action" property. On success, all actions
[broadcast game state](#Server Responses) to all players (spectators and
seated players alike).

**NOTE:** All "Prerequisites" are handled by the server and need not be
checked by the client. An error message will be given to the client if a
prereq isn't met (ex: playing out of turn). This simplifies client creation
considerably.

#### `chat`

Properties:
- `msg`: Required, message to send to other players

Responds with `{ "msg_type": "chat", "msg": "PLAYER: msg" }` to all players.

#### `take_seat`

Properties:
- `seat`: Required, 0-3 integer, open seat to occupy

#### `stand_up`

If seated, moves player to spectator view

#### `start_game`

Kicks off the first deal and starts the game.

Properties:
- `start_seat`: Optional, -1-3. -1 means random starting player, 0-3
  means that seat should be the first dealer.

Prerequisites:
* Only valid during the `lobby` phase
* 4 players must be seated

#### `restart_game`

Creates a new Game entirely (resets table, scores, hands, etc).

Prerequisites:
* Only valid during the `end` phase

#### `order`

Properties:
- `vote`: either suit ('H', 'D', 'S', 'C') or 'pass'
- `loner`: 0 or 1

Only accepted during the trump suit selection phase. Server handles
validation of what suits can be nominated.

Prerequisites:
* Must be player's turn to act.
* Only valid during the `vote` phase

#### `play_card`

Properties:
- `card`: two letter unique card. ex:
  - 'NH' -- nine of hearts
  - 'AS' -- ace of spades
  - 'TD' -- ten of diamonds

Server handles validation of whether the current player truly has that card
(and whether it is legal to play, i.e. following suit).

Prerequisites:
* Must be player's turn to act.
* Only valid during the `play` phase

#### `dealer_swap`

Properties:
- `card`: Same as `play_card`

Swaps dealer's card with the kitty card (like `play_card`, server validates
the card is in dealer's hand).

Prerequisites:
* Must be the dealer
* Only valid during the `dealer_swap` phase

### Server Responses

All server responses have the `msg_type` property, which the below sections
all represent.

#### `error`

As mentioned above, the server handles most of the coordination logic for the
clients (who's turn is it, do you have that card, etc). This prevents both
malicious clients, and makes it easier to create a new client.

In any case where an action was invalid for any reason, the server will
respond to the client with an error:

    { "msg_type": "error", "errno": N, "msg": "Foo" }

"errno" is guaranteed to be unique and not change so that clients can
write custom error handling. See [Euchre::Errors](lib/Euchre/Errors.pm) for
the human readable constants.

#### `game_state`

This is the most common message from the server. It represents the game state,
and is sent on every successful action from any player to all other players at
the table (whether it's seat manipulation, cards played, etc)

The response looks like this:

```json
{
  "msg_type": "game_state",
  "game" : {
    "dealer": 0
    "hand_lengths": [ 5, 5, 5, 5 ],
    "out_player": -1,
    "pass_count": 0,
    "phase": "vote",
    "players": [ "Alex", "Chris", "Jennie", "Lydecke" ],
    "spectators": [ "Matt", "Sammy" ],
    "tricks": [ 0, 0, 0, 0 ],
    "trump": null,
    "trump_nominee": "TS",
    "turn": 1,
  }
  "hand": [ "TH", "JD", "KD", ... ],
  "is_spectator": 0,
  "table_id": "The Cool Kids Table",
}
```

Some general comments:

* `dealer`, `out_player`, and `turn` are seat numbers, 0 indexed (`out_player` is
  the partner of a loner, -1 if no loners)
* `players` are the players names in order of seats
* `hand` is only present for players in the game

#### `chat`

Broadcasted to all players at table with the contents of a `chat` action.

Not logged on the server, only shown to clients that watch it.

#### `pong`

Response to `ping`. (Side note: I _know_ this isn't how one should properly
handle ping/pong frames, but this is an MVP here and my first foray into
websockets. It works!)
