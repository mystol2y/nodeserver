const app = require('express')();
const http = require('http').createServer(app);
const util = require('util');
const mysql = require('mysql');
const PORT = process.env.PORT || 3000;
const con = mysql.createPool({
    host: 'localhost',
    user: 'huayhub',
    password: 'Pk^3z4g2',
    database: 'huayhub'
});
app.get("/", (req, res) => {
    res.json({
        result: "ok",
        data: [1, 2]
    })
});
con.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.')
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.')
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.')
        }
    }

    if (connection) connection.release()

    return
})

const io = require("socket.io")(http, {
    cors: {
        origin: "https://huay999.vip",
        methods: ["GET", "POST"],
    }
});

app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*",
        'Content-Type', 'text/plain');
    next();
})

var clients = 0;
users = [];
io.on('connection', async function(socket) {
    socket.emit('connected', socket.id);
    socket.on('join', (room) => {
        socket.join(room);
    });
    clients++;
    let guest;
    let user_id;
    let current_credit;
    let vat_games = 5;
    let credit;
    // con.query("SELECT * FROM vat_games", (err, res) => {
    //     vat_games = await res[0].vat_percen;
    // });
    io.sockets.emit('broadcast', { message: clients + ' Client connected' });
    //console.log('connected');
    // ------------------------------------------------------------------------------------------------------------
    socket.on('create_room', (data, room) => {
        let today = new Date();
        let create_date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let create_time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        let create_dateTime = create_date + ' ' + create_time;
        today.setHours(today.getHours() + 1);
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        let dateTime = date + ' ' + time;
        user_id = data.user_id;
        if (room == 'high_low') {
            con.query("SELECT * FROM player where player_id =" + user_id, async(err, result) => {
                current_credit = result[0].current_balance;
                credit = await checkCredit(current_credit, data.bet);
                if (credit > 0) {
                    const host_bet = data.userChoice.split("");
                    const hi_lo = parseInt(host_bet[0]) + parseInt(host_bet[1]) + parseInt(host_bet[2])
                    if (hi_lo > 10) {
                        host_bet[3] = 1;
                    } else {
                        host_bet[3] = 2;
                    }
                    var insertId = '';
                    var new_rc = '';
                    var new_mrc = '';
                    con.query("INSERT INTO high_low_log(\n" +
                        "                                            user_name,\n" +
                        "                                            user_id,\n" +
                        "                                            user_Choice,\n" +
                        "                                            bet,\n" +
                        "                                            status,\n" +
                        "                                            created_date,\n" +
                        "                                            date_end\n" +
                        "                                            )" +
                        "VALUES ('" + data.username + "','" + data.user_id + "','" + data.userChoice + "'," +
                        "'" + data.bet + "',0,'" + create_dateTime + "','" + dateTime + "')",
                        async function(error, result) {
                            insertId = await result.insertId;
                            let newCredit = current_credit - data.bet;
                            con.query("UPDATE player SET current_balance =" +
                                "'" + newCredit + "'where player_id ='" + user_id + "'",
                                (err, res) => {
                                    con.query("UPDATE high_low_log SET status=1 WHERE id =" + insertId + "", (res) => {
                                        con.query("SELECT count(*) rc FROM high_low_log WHERE  status= 1", (err, res) => {
                                            new_rc = res[0].rc;
                                            con.query("SELECT count(*) as mrc FROM high_low_log WHERE  status= 1 and user_id =" + "'" + data.user_id + "'",
                                                (err, res) => {
                                                    new_mrc = res[0].mrc;
                                                    socket.emit('new_myroom', {
                                                        newCredit: newCredit,
                                                        username: data.username,
                                                        user_id: data.user_id,
                                                        room_id: insertId,
                                                        userchoice: host_bet,
                                                        bet: data.bet,
                                                        created_date: create_dateTime,
                                                        date_end: today.getTime(),
                                                        new_rc: new_rc,
                                                        new_mrc: new_mrc
                                                    });
                                                    socket.to(room).emit('new_room', {
                                                        username: data.username,
                                                        user_id: data.user_id,
                                                        room_id: insertId,
                                                        bet: data.bet,
                                                        created_date: create_dateTime,
                                                        date_end: today.getTime(),
                                                        new_rc: new_rc,
                                                        new_mrc: new_mrc
                                                    });
                                                });
                                        });
                                    })
                                });
                            // res.end(JSON.stringify(messages));
                        });
                }
            });

        } else if (room == 'head_tail') {
            con.query("SELECT * FROM player where player_id =" + user_id, async(err, result) => {
                current_credit = result[0].current_balance;
                credit = await checkCredit(current_credit, data.bet);
                var insertId = '';
                var new_rc = '';
                var new_mrc = '';
                if (credit > 0) {
                    con.query("INSERT INTO heads_tails_log(\n" +
                        "                                            user_name,\n" +
                        "                                            user_id,\n" +
                        "                                            user_Choice,\n" +
                        "                                            bet,\n" +
                        "                                            status,\n" +
                        "                                            created_date,\n" +
                        "                                            date_end\n" +
                        "                                            )" +
                        "VALUES ('" + data.username + "','" + data.user_id + "','" + data.userChoice + "'," +
                        "'" + data.bet + "',0,'" + create_dateTime + "','" + dateTime + "')",
                        async function(error, result) {
                            insertId = await result.insertId;
                            let newCredit = current_credit - data.bet;
                            await con.query("UPDATE player SET current_balance =" +
                                "'" + newCredit + "'where player_id ='" + user_id + "'",
                                (err, res) => {

                                    socket.emit('check1', "UPDATE player SET current_balance =" +
                                        "'" + newCredit + "'where player_id ='" + user_id + "'");

                                    con.query("UPDATE heads_tails_log SET status=1 WHERE id =" + insertId + "", (res) => {
                                        con.query("SELECT count(*) rc FROM heads_tails_log WHERE  status= 1", (err, res) => {
                                            new_rc = res[0].rc;
                                            con.query("SELECT count(*) as mrc FROM heads_tails_log WHERE  status= 1 and user_id =" + "'" + data.user_id + "'",
                                                (err, res) => {
                                                    new_mrc = res[0].mrc;
                                                    socket.emit('new_myroom', {
                                                        newCredit: newCredit,
                                                        username: data.username,
                                                        user_id: data.user_id,
                                                        room_id: insertId,
                                                        userchoice: data.userChoice,
                                                        bet: data.bet,
                                                        created_date: create_dateTime,
                                                        date_end: today.getTime(),
                                                        new_rc: new_rc,
                                                        new_mrc: new_mrc
                                                    });
                                                    socket.to(room).emit('new_room', {
                                                        username: data.username,
                                                        user_id: data.user_id,
                                                        room_id: insertId,
                                                        bet: data.bet,
                                                        created_date: create_dateTime,
                                                        date_end: today.getTime(),
                                                        new_rc: new_rc,
                                                        new_mrc: new_mrc
                                                    });
                                                });
                                        });
                                    })
                                });
                            // res.end(JSON.stringify(messages));
                        });
                }
            });


        } else if (room == 'yingchub') {
            con.query("SELECT * FROM player where player_id =" + user_id, async(err, result) => {
                current_credit = result[0].current_balance;
                credit = await checkCredit(current_credit, data.bet);
                if (credit > 0) {
                    var insertId = '';
                    var new_rc = '';
                    var new_mrc = '';
                    con.query("INSERT INTO paoyingchub_log(\n" +
                        "                                            user_name,\n" +
                        "                                            user_id,\n" +
                        "                                            user_Choice,\n" +
                        "                                            bet,\n" +
                        "                                            status,\n" +
                        "                                            created_date,\n" +
                        "                                            date_end\n" +
                        "                                            )" +
                        "VALUES ('" + data.username + "','" + data.user_id + "','" + data.userChoice + "'," +
                        "'" + data.bet + "',0,'" + create_dateTime + "','" + dateTime + "')",
                        async function(error, result) {
                            insertId = await result.insertId;
                            let newCredit = current_credit - data.bet;
                            con.query("UPDATE player SET current_balance =" +
                                "'" + newCredit + "'where player_id ='" + user_id + "'",
                                (err, res) => {
                                    con.query("UPDATE paoyingchub_log SET status=1 WHERE id =" + insertId + "", (res) => {
                                        con.query("SELECT count(*) rc FROM paoyingchub_log WHERE  status= 1", (err, res) => {
                                            new_rc = res[0].rc;
                                            con.query("SELECT count(*) as mrc FROM paoyingchub_log WHERE  status= 1 and user_id =" + "'" + data.user_id + "'",
                                                (err, res) => {
                                                    new_mrc = res[0].mrc;
                                                    socket.emit('new_myroom', {
                                                        newCredit: newCredit,
                                                        username: data.username,
                                                        user_id: data.user_id,
                                                        room_id: insertId,
                                                        userchoice: data.userChoice,
                                                        bet: data.bet,
                                                        created_date: create_dateTime,
                                                        date_end: today.getTime(),
                                                        new_rc: new_rc,
                                                        new_mrc: new_mrc
                                                    });
                                                    socket.to(room).emit('new_room', {
                                                        username: data.username,
                                                        user_id: data.user_id,
                                                        room_id: insertId,
                                                        bet: data.bet,
                                                        created_date: create_dateTime,
                                                        date_end: today.getTime(),
                                                        new_rc: new_rc,
                                                        new_mrc: new_mrc
                                                    });
                                                });
                                        });
                                    })
                                });
                            // res.end(JSON.stringify(messages));
                        });
                }
            });
        }
    });

    socket.on('vs_click', (data, room) => {
        user_id = data.user_id;
        let room_id = data.room_id;
        if (room == 'high_low') {
            con.query("SELECT * FROM player where player_id =" + user_id, (err, result) => {
                current_credit = result[0].current_balance;
                guest = result[0];
            });
            con.query("SELECT * FROM high_low_log WHERE id=" + room_id + ' AND status = 1', async(err, res) => {
                if (err || res.length < 1) {
                    socket.emit('room_has_played', 'room_has_played');
                } else {
                    credit = await checkCredit(current_credit, res[0].bet);
                    if (res[0] != '' && credit > 0) {
                        let host_bet = res[0].user_Choice.split("");
                        let hi_lo = parseInt(host_bet[0]) + parseInt(host_bet[1]) + parseInt(host_bet[2]);
                        let host_choice = '';
                        if (hi_lo > 10) {
                            host_choice = numTochar(1);
                        } else {
                            host_choice = numTochar(2);
                        }
                        let host_name = res[0].user_name;
                        let host_id = res[0].user_id;
                        let guest_choice = numTochar(data.vschoice);
                        switch (host_choice + guest_choice) {
                            case "hl":
                            case "lh":
                                hostwin(host_id, host_name, host_choice, guest_choice, room_id, res[0].bet, room);
                                break;
                            case "hh":
                            case "ll":
                                hostlose(host_id, host_name, host_choice, guest_choice, room_id, res[0].bet, room);
                                break;
                        }
                    }
                }
            });
        } else if (room == 'head_tail') {
            con.query("SELECT * FROM player where player_id =" + user_id, (err, result) => {
                current_credit = result[0].current_balance;
                guest = result[0];
            });
            con.query("SELECT * FROM heads_tails_log WHERE id=" + room_id + ' AND status = 1', async(err, res) => {
                if (err || res.length < 1) {
                    socket.emit('room_has_played', 'room_has_played');
                } else {
                    credit = await checkCredit(current_credit, res[0].bet);
                    if (res[0] != '' && credit > 0) {
                        let host_choice = res[0].user_Choice;
                        let host_name = res[0].user_name;
                        let host_id = res[0].user_id;
                        let guest_choice = numTochar_headtail(data.vschoice);
                        socket.emit('check', host_choice + guest_choice);
                        switch (host_choice + guest_choice) {
                            case "ht":
                            case "th":
                                hostwin(host_id, host_name, host_choice, guest_choice, room_id, res[0].bet, room);
                                socket.emit('check', host_choice + guest_choice);
                                break;
                            case "hh":
                            case "tt":
                                hostlose(host_id, host_name, host_choice, guest_choice, room_id, res[0].bet, room);
                                socket.emit('check', host_choice + guest_choice);
                                break;
                        }
                    }
                }
            });
        } else if (room == 'yingchub') {
            con.query("SELECT * FROM player where player_id =" + user_id, (err, result) => {
                current_credit = result[0].current_balance;
                guest = result[0];
            });
            con.query("SELECT * FROM paoyingchub_log WHERE id=" + room_id + ' AND status = 1', async(err, res) => {
                if (err || res.length < 1) {
                    socket.emit('room_has_played', 'room_has_played');
                } else {
                    credit = await checkCredit(current_credit, res[0].bet);
                    if (res[0] != '' && credit > 0) {
                        let host_choice = res[0].user_Choice;
                        let host_name = res[0].user_name;
                        let host_id = res[0].user_id;
                        let guest_choice = numTochar_yingchub(data.vschoice);
                        socket.emit('check', host_choice + guest_choice);
                        switch (host_choice + guest_choice) {
                            case "rs":
                            case "pr":
                            case "sp":
                                hostwin(host_id, host_name, host_choice, guest_choice, room_id, res[0].bet, room);
                                break;
                            case "rp":
                            case "ps":
                            case "sr":
                                hostlose(host_id, host_name, host_choice, guest_choice, room_id, res[0].bet, room);
                                break;
                            case "rr":
                            case "pp":
                            case "ss":
                                draw(host_id, host_name, host_choice, guest_choice, room_id, res[0].bet, room);
                                break;
                        }
                    }
                }
            });
        }
    });

    socket.on('setup', async(data, room) => {
        user_id = data.user_id;
        if (room == 'high_low') {
            socket.emit('check', 'dovs');
            let mystat = await doViewMydata(user_id, room);
            socket.emit('stat' + user_id, { mystat: mystat });
        } else if (room == 'head_tail') {
            let mystat = await doViewMydata(user_id, room);
            socket.emit('stat' + user_id, { mystat: mystat });
        } else if (room == 'yingchub') {
            let mystat = await doViewMydata(user_id, room);
            socket.emit('stat' + user_id, { mystat: mystat });
        }
    });

    //not use now
    socket.on('top20', async(data, room) => {
        let top20 = await dotop20();
    });

    socket.on('vsbot', (data, room) => {
        let today = new Date();
        let create_date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let create_time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        let create_dateTime = create_date + ' ' + create_time;
        today.setHours(today.getHours() + 1);
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        let dateTime = date + ' ' + time;
        user_id = data.user_id;
        if (room == 'high_low') {
            con.query("SELECT * FROM player where player_id =" + user_id, async(err, result) => {
                current_credit = result[0].current_balance;
                credit = await checkCredit(current_credit, data.bet);
                if (data.result == 'win' && credit > 0) {
                    con.query("INSERT INTO high_low_log(\n" +
                        "                                            user_name,\n" +
                        "                                            user_id,\n" +
                        "                                            user_Choice,\n" +
                        "                                            opn_name,\n" +
                        "                                            opn_id,\n" +
                        "                                            opn_Choice,\n" +
                        "                                            winner,\n" +
                        "                                            bet,\n" +
                        "                                            status,\n" +
                        "                                            created_date,\n" +
                        "                                            date_end\n" +
                        "                                            )" +
                        "VALUES ('" + data.username + "','" + data.user_id + "','" + data.userChoice + "','bot',0,'" + data.ComputerChoice + "','" + data.user_id + "'," +
                        "'" + data.bet + "',3,'" + create_dateTime + "','" + dateTime + "')",
                        async function(error, result) {
                            let newCredit = current_credit + (data.bet - (data.bet * vat_games / 100));
                            con.query("update player set current_balance =" +
                                "'" + newCredit + "' where player_id = " +
                                "'" + data.user_id + "'", (err, res) => {
                                    socket.emit('vsbot_res', { newCredit: newCredit });
                                });
                        });
                } else if (data.result == 'lose' && credit > 0) {
                    con.query("INSERT INTO high_low_log(\n" +
                        "                                            user_name,\n" +
                        "                                            user_id,\n" +
                        "                                            user_Choice,\n" +
                        "                                            opn_name,\n" +
                        "                                            opn_id,\n" +
                        "                                            opn_Choice,\n" +
                        "                                            winner,\n" +
                        "                                            bet,\n" +
                        "                                            status,\n" +
                        "                                            created_date,\n" +
                        "                                            date_end\n" +
                        "                                            )" +
                        "VALUES ('" + data.username + "','" + data.user_id + "','" + data.userChoice + "','bot',0,'" + data.ComputerChoice + "',0," +
                        "'" + data.bet + "',3,'" + create_dateTime + "','" + dateTime + "')",
                        async function(error, result) {
                            let newCredit = current_credit - data.bet;
                            con.query("update player set current_balance =" +
                                "'" + newCredit + "' where player_id = " +
                                "'" + data.user_id + "'", (err, res) => {
                                    socket.emit('vsbot_res', { newCredit: newCredit });
                                });
                        });
                }
            });

        } else if (room == 'head_tail') {
            con.query("SELECT * FROM player where player_id =" + user_id, async(err, result) => {
                current_credit = result[0].current_balance;
                credit = await checkCredit(current_credit, data.bet);
                if (data.result == 'win' && credit > 0) {
                    con.query("INSERT INTO heads_tails_log(\n" +
                        "                                            user_name,\n" +
                        "                                            user_id,\n" +
                        "                                            user_Choice,\n" +
                        "                                            opn_name,\n" +
                        "                                            opn_id,\n" +
                        "                                            opn_Choice,\n" +
                        "                                            winner,\n" +
                        "                                            bet,\n" +
                        "                                            status,\n" +
                        "                                            created_date,\n" +
                        "                                            date_end\n" +
                        "                                            )" +
                        "VALUES ('" + data.username + "','" + data.user_id + "','" + data.userChoice + "','bot',0,'" + data.ComputerChoice + "','" + data.user_id + "'," +
                        "'" + data.bet + "',3,'" + create_dateTime + "','" + dateTime + "')",
                        async function(error, result) {
                            let newCredit = current_credit + (data.bet - (data.bet * vat_games / 100));
                            con.query("update player set current_balance =" +
                                "'" + newCredit + "' where player_id = " +
                                "'" + data.user_id + "'", (err, res) => {
                                    socket.emit('vsbot_res', { newCredit: newCredit });
                                });
                        });
                } else if (data.result == 'lose' && credit > 0) {
                    con.query("INSERT INTO heads_tails_log(\n" +
                        "                                            user_name,\n" +
                        "                                            user_id,\n" +
                        "                                            user_Choice,\n" +
                        "                                            opn_name,\n" +
                        "                                            opn_id,\n" +
                        "                                            opn_Choice,\n" +
                        "                                            winner,\n" +
                        "                                            bet,\n" +
                        "                                            status,\n" +
                        "                                            created_date,\n" +
                        "                                            date_end\n" +
                        "                                            )" +
                        "VALUES ('" + data.username + "','" + data.user_id + "','" + data.userChoice + "','bot',0,'" + data.ComputerChoice + "',0," +
                        "'" + data.bet + "',3,'" + create_dateTime + "','" + dateTime + "')",
                        async function(error, result) {
                            let newCredit = current_credit - data.bet;
                            con.query("update player set current_balance =" +
                                "'" + newCredit + "' where player_id = " +
                                "'" + data.user_id + "'", (err, res) => {
                                    socket.emit('vsbot_res', { newCredit: newCredit });
                                });
                        });
                }
            });

        } else if (room == 'yingchub') {
            con.query("SELECT * FROM player where player_id =" + user_id, async(err, result) => {
                current_credit = result[0].current_balance;
                credit = await checkCredit(current_credit, data.bet);
                if (data.result == 'win' && credit > 0) {
                    con.query("INSERT INTO paoyingchub_log(\n" +
                        "                                            user_name,\n" +
                        "                                            user_id,\n" +
                        "                                            user_Choice,\n" +
                        "                                            opn_name,\n" +
                        "                                            opn_id,\n" +
                        "                                            opn_Choice,\n" +
                        "                                            winner,\n" +
                        "                                            bet,\n" +
                        "                                            status,\n" +
                        "                                            created_date,\n" +
                        "                                            date_end\n" +
                        "                                            )" +
                        "VALUES ('" + data.username + "','" + data.user_id + "','" + data.userChoice + "','bot',0,'" + data.ComputerChoice + "','" + data.user_id + "'," +
                        "'" + data.bet + "',3,'" + create_dateTime + "','" + dateTime + "')",
                        async function(error, result) {
                            let newCredit = current_credit + (data.bet - (data.bet * vat_games / 100));
                            con.query("update player set current_balance =" +
                                "'" + newCredit + "' where player_id = " +
                                "'" + data.user_id + "'", (err, res) => {
                                    socket.emit('vsbot_res', { newCredit: newCredit });
                                });
                        });
                } else if (data.result == 'lose' && credit > 0) {
                    con.query("INSERT INTO paoyingchub_log(\n" +
                        "                                            user_name,\n" +
                        "                                            user_id,\n" +
                        "                                            user_Choice,\n" +
                        "                                            opn_name,\n" +
                        "                                            opn_id,\n" +
                        "                                            opn_Choice,\n" +
                        "                                            winner,\n" +
                        "                                            bet,\n" +
                        "                                            status,\n" +
                        "                                            created_date,\n" +
                        "                                            date_end\n" +
                        "                                            )" +
                        "VALUES ('" + data.username + "','" + data.user_id + "','" + data.userChoice + "','bot',0,'" + data.ComputerChoice + "',0," +
                        "'" + data.bet + "',3,'" + create_dateTime + "','" + dateTime + "')",
                        async function(error, result) {
                            let newCredit = current_credit - data.bet;
                            con.query("update player set current_balance =" +
                                "'" + newCredit + "' where player_id = " +
                                "'" + data.user_id + "'", (err, res) => {
                                    socket.emit('vsbot_res', { newCredit: newCredit });
                                });
                        });
                } else if (data.result == 'draw' && credit > 0) {
                    con.query("INSERT INTO paoyingchub_log(\n" +
                        "                                            user_name,\n" +
                        "                                            user_id,\n" +
                        "                                            user_Choice,\n" +
                        "                                            opn_name,\n" +
                        "                                            opn_id,\n" +
                        "                                            opn_Choice,\n" +
                        "                                            winner,\n" +
                        "                                            bet,\n" +
                        "                                            status,\n" +
                        "                                            created_date,\n" +
                        "                                            date_end\n" +
                        "                                            )" +
                        "VALUES ('" + data.username + "','" + data.user_id + "','" + data.userChoice + "','bot',0,'" + data.ComputerChoice + "',0," +
                        "'" + data.bet + "',3,'" + create_dateTime + "','" + dateTime + "')",
                        async function(error, result) {
                            let newCredit = current_credit
                            con.query("update player set current_balance =" +
                                "'" + newCredit + "' where player_id = " +
                                "'" + data.user_id + "'", (err, res) => {
                                    socket.emit('vsbot_res', { newCredit: newCredit });
                                });
                        });
                }
            });

        }
    });

    socket.on('timeout', (data, room) => {
        if (room == 'high_low') {
            let item_id = data.item_id;
            let new_rc = '';
            let new_mrc = '';
            con.query("SELECT * FROM high_low_log WHERE id=" + item_id, (err, res0) => {
                con.query("UPDATE high_low_log SET STATUS =4 WHERE id=" + item_id, (err, res) => {
                    con.query("SELECT * FROM high_low_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM high_low_log WHERE status= 1 AND user_id=" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            io.in(room).emit('remove_display', {
                                item_id: item_id,
                                host_id: res0[0].user_id,
                                type: data.type,
                                new_rc: new_rc,
                                new_mrc: new_mrc
                            });
                        });
                    });
                });
            });
        } else if (room == 'head_tail') {
            let item_id = data.item_id;
            let new_rc = '';
            let new_mrc = '';
            con.query("SELECT * FROM heads_tails_log WHERE id=" + item_id, (err, res0) => {
                con.query("UPDATE heads_tails_log SET STATUS =4 WHERE id=" + item_id, (err, res) => {
                    con.query("SELECT * FROM heads_tails_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM heads_tails_log WHERE status= 1 AND user_id=" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            io.in(room).emit('remove_display', {
                                item_id: item_id,
                                host_id: res0[0].user_id,
                                type: data.type,
                                new_rc: new_rc,
                                new_mrc: new_mrc
                            });
                        });
                    });
                });
            });
        } else if (room == 'yingchub') {
            let item_id = data.item_id;
            let new_rc = '';
            let new_mrc = '';
            con.query("SELECT * FROM paoyingchub_log WHERE id=" + item_id, (err, res0) => {
                con.query("UPDATE paoyingchub_log SET STATUS =4 WHERE id=" + item_id, (err, res) => {
                    con.query("SELECT * FROM paoyingchub_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM paoyingchub_log WHERE status= 1 AND user_id=" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            io.in(room).emit('remove_display', {
                                item_id: item_id,
                                host_id: res0[0].user_id,
                                type: data.type,
                                new_rc: new_rc,
                                new_mrc: new_mrc
                            });
                        });
                    });
                });
            });
        }
    });

    socket.on('numclick', (data, room) => {
        if (room == 'high_low') {
            if (data.type == 'all') {
                con.query("SELECT * FROM high_low_log WHERE  status= 1 and user_id != " + data.user_id + " order by created_date asc limit 0 ," + data.maxpage, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        let host_bet = res[i].user_Choice.split("");
                        let hi_lo = parseInt(host_bet[0]) + parseInt(host_bet[1]) + parseInt(host_bet[2]);
                        if (hi_lo > 10) {
                            host_bet[3] = numTochar(1);
                        } else {
                            host_bet[3] = numTochar(2);
                        }
                        game_list.push({
                            id: res[i].id,
                            user_name: res[i].user_name,
                            user_id: res[i].user_id,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM high_low_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM high_low_log WHERE status= 1 AND user_id =" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('numclick_res', {
                                game_list: game_list,
                                type: data.type,
                                new_rc: new_rc,
                                new_mrc: new_mrc
                            });
                        });
                    });
                });
            } else {
                con.query("SELECT * FROM high_low_log WHERE  status= 1 and user_id = " + data.user_id + " order by created_date asc limit 0 ," + data.maxpage, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        let host_bet = res[i].user_Choice.split("");
                        let hi_lo = parseInt(host_bet[0]) + parseInt(host_bet[1]) + parseInt(host_bet[2]);
                        if (hi_lo > 10) {
                            host_bet[3] = 1;
                        } else {
                            host_bet[3] = 2;
                        }
                        game_list.push({
                            id: res[i].id,
                            user_name: res[i].user_name,
                            user_id: res[i].user_id,
                            choice: host_bet,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM high_low_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM high_low_log WHERE status= 1 AND user_id=" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('numclick_res', { game_list: game_list, new_rc: new_rc, new_mrc: new_mrc });
                        });
                    });
                });
            }
        } else if (room == 'head_tail') {
            if (data.type == 'all') {
                con.query("SELECT * FROM heads_tails_log WHERE  status= 1 and user_id != " + data.user_id + " order by created_date asc limit 0 ," + data.maxpage, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        game_list.push({
                            id: res[i].id,
                            user_name: res[i].user_name,
                            user_id: res[i].user_id,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM heads_tails_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM heads_tails_log WHERE status= 1 AND user_id =" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('numclick_res', {
                                game_list: game_list,
                                type: data.type,
                                new_rc: new_rc,
                                new_mrc: new_mrc
                            });
                        });
                    });
                });
            } else {
                con.query("SELECT * FROM heads_tails_log WHERE  status= 1 and user_id = " + data.user_id + " order by created_date asc limit 0 ," + data.maxpage, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        game_list.push({
                            id: res[i].id,
                            user_name: res[i].user_name,
                            user_id: res[i].user_id,
                            choice: res[i].user_Choice,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM heads_tails_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM heads_tails_log WHERE status= 1 AND user_id=" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('numclick_res', { game_list: game_list, new_rc: new_rc, new_mrc: new_mrc });
                        });
                    });
                });
            }
        } else if (room == 'yingchub') {
            if (data.type == 'all') {
                con.query("SELECT * FROM paoyingchub_log WHERE  status= 1 and user_id != " + data.user_id + " order by created_date asc limit 0 ," + data.maxpage, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        game_list.push({
                            id: res[i].id,
                            user_name: res[i].user_name,
                            user_id: res[i].user_id,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM paoyingchub_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM paoyingchub_log WHERE status= 1 AND user_id =" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('numclick_res', {
                                game_list: game_list,
                                type: data.type,
                                new_rc: new_rc,
                                new_mrc: new_mrc
                            });
                        });
                    });
                });
            } else {
                con.query("SELECT * FROM paoyingchub_log WHERE  status= 1 and user_id = " + data.user_id + " order by created_date asc limit 0 ," + data.maxpage, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        game_list.push({
                            id: res[i].id,
                            user_name: res[i].user_name,
                            user_id: res[i].user_id,
                            choice: res[i].user_Choice,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM paoyingchub_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM paoyingchub_log WHERE status= 1 AND user_id=" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('numclick_res', { game_list: game_list, new_rc: new_rc, new_mrc: new_mrc });
                        });
                    });
                });
            }
        }

    });

    socket.on('add_room', (data, room) => {
        if (room == 'high_low') {
            if (data.action == 'remove_display') {
                con.query("SELECT * FROM high_low_log WHERE  status= 1 and user_id != " + data.user_id + " order by created_date asc limit " + data.start + " ," + data.end, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        game_list.push({
                            id: res[i].id,
                            user_id: res[i].user_id,
                            user_name: res[i].user_name,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM high_low_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM high_low_log WHERE status= 1 AND user_id =" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('add_room_res', {
                                game_list: game_list,
                                type: data.type,
                                new_rc: new_rc,
                                new_mrc: new_mrc
                            });
                        });
                    });
                });
            } else {
                con.query("SELECT * FROM high_low_log WHERE  status= 1 and user_id = " + data.user_id + " order by created_date asc limit " + data.start + " ," + data.end, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        let host_bet = res[i].user_Choice.split("");
                        let hi_lo = parseInt(host_bet[0]) + parseInt(host_bet[1]) + parseInt(host_bet[2]);
                        if (hi_lo > 10) {
                            host_bet[3] = 1;
                        } else {
                            host_bet[3] = 2;
                        }
                        game_list.push({
                            id: res[i].id,
                            user_id: res[i].user_id,
                            user_name: res[i].user_name,
                            choice: host_bet,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM high_low_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM high_low_log WHERE status= 1 AND user_id =" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('add_myroom_res', { game_list: game_list, type: data.type, new_mrc: new_mrc });
                        });
                    });
                });
            }
        } else if (room == 'head_tail') {
            if (data.action == 'remove_display') {
                con.query("SELECT * FROM heads_tails_log WHERE  status= 1 and user_id != " + data.user_id + " order by created_date asc limit " + data.start + " ," + data.end, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        game_list.push({
                            id: res[i].id,
                            user_id: res[i].user_id,
                            user_name: res[i].user_name,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM heads_tails_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM heads_tails_log WHERE status= 1 AND user_id =" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('add_room_res', {
                                game_list: game_list,
                                type: data.type,
                                new_rc: new_rc,
                                new_mrc: new_mrc
                            });
                        });
                    });
                });
            } else {
                con.query("SELECT * FROM heads_tails_log WHERE  status= 1 and user_id = " + data.user_id + " order by created_date asc limit " + data.start + " ," + data.end, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        let host_bet = res[i].user_Choice;

                        game_list.push({
                            id: res[i].id,
                            user_id: res[i].user_id,
                            user_name: res[i].user_name,
                            choice: host_bet,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM heads_tails_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM heads_tails_log WHERE status= 1 AND user_id =" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('add_myroom_res', { game_list: game_list, type: data.type, new_mrc: new_mrc });
                        });
                    });
                });
            }
        } else if (room == 'yingchub') {
            if (data.action == 'remove_display') {
                con.query("SELECT * FROM paoyingchub_log WHERE  status= 1 and user_id != " + data.user_id + " order by created_date asc limit " + data.start + " ," + data.end, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        game_list.push({
                            id: res[i].id,
                            user_id: res[i].user_id,
                            user_name: res[i].user_name,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM paoyingchub_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM paoyingchub_log WHERE status= 1 AND user_id =" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('add_room_res', {
                                game_list: game_list,
                                type: data.type,
                                new_rc: new_rc,
                                new_mrc: new_mrc
                            });
                        });
                    });
                });
            } else {
                con.query("SELECT * FROM paoyingchub_log WHERE  status= 1 and user_id = " + data.user_id + " order by created_date asc limit " + data.start + " ," + data.end, (err, res) => {
                    let game_list = [];
                    for (let i = 0; i < res.length; i++) {
                        let today = new Date(res[i].date_end);
                        let host_bet = res[i].user_Choice;
                        game_list.push({
                            id: res[i].id,
                            user_id: res[i].user_id,
                            user_name: res[i].user_name,
                            choice: host_bet,
                            bet: res[i].bet,
                            timeset: today.getTime(),
                            created_date: res[i].created_date
                        });
                    }
                    let new_rc = '';
                    let new_mrc = '';
                    con.query("SELECT * FROM paoyingchub_log WHERE status= 1", (err, res1) => {
                        new_rc = res1.length;
                        con.query("SELECT * FROM paoyingchub_log WHERE status= 1 AND user_id =" + data.user_id, (err, res2) => {
                            new_mrc = res2.length;
                            socket.emit('add_myroom_res', { game_list: game_list, type: data.type, new_mrc: new_mrc });
                        });
                    });
                });
            }
        }
    });

    function hostwin(host_id, host_name, host_choice, guest_choice, room_id, bet, room) {
        let new_rc;
        let new_mrc;
        let guest_id = user_id;
        if (room == 'high_low') {
            con.query("SELECT * FROM player WHERE player_id =" + host_id, async(err, host) => {
                let current_credit_host = parseFloat(host[0].current_balance);
                let current_credit_guest = current_credit;
                con.query("UPDATE high_low_log SET  opn_name=" +
                    "'" + guest.first_name +
                    "', opn_id='" + guest_id +
                    "', opn_Choice='" + guest_choice +
                    "', winner='" + host_id +
                    "' , status= 2 WHERE id=" + room_id, async() => {
                        let newCredithost = current_credit_host + bet + (bet - (bet * vat_games / 100));
                        con.query("update player set current_balance =" +
                            "'" + newCredithost + "' where player_id = " +
                            "'" + host_id + "'");
                        // //update credit guest
                        let newCreditguest = current_credit_guest - bet;
                        con.query("update player set current_balance =" +
                            "'" + newCreditguest + "' where player_id = " +
                            "'" + guest_id + "'");
                        con.query("SELECT count(*) rc FROM high_low_log WHERE  status= 1", (err, res1) => {
                            new_rc = res1[0].rc;
                            con.query("SELECT count(*) as mrc FROM high_low_log WHERE  status= 1 and user_id =" + "'" + host_id + "'",
                                (err, res2) => {
                                    new_mrc = res2[0].mrc;
                                    socket.emit('onVsclick_res', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        result: 'lose'
                                    });
                                    socket.to(room).emit(host_id + 'win', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        new_rc: new_rc,
                                        new_mrc: new_mrc
                                    });
                                    io.in(room).emit('remove_display', {
                                        room_id: room_id,
                                        host_id: host_id,
                                        new_rc: new_rc
                                    });
                                });
                        });
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + host_id + ",'" + host_name + "')");
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + guest_id + ",'" + guest.first_name + "')");
                        let mystathost = await doViewMydata(host_id, room);
                        let mystatguest = await doViewMydata(guest_id, room);
                        socket.to(room).emit('stat' + host_id, { mystat: mystathost, newCredit: newCredithost });
                        socket.emit('stat' + guest_id, { mystat: mystatguest, newCredit: newCreditguest });
                    });
                //update credit host
            });
        } else if (room == 'head_tail') {
            socket.emit('check', 'win');
            con.query("SELECT * FROM player WHERE player_id =" + host_id, async(err, host) => {
                let current_credit_host = parseFloat(host[0].current_balance);
                let current_credit_guest = current_credit;
                con.query("UPDATE heads_tails_log SET  opn_name=" +
                    "'" + guest.first_name +
                    "', opn_id='" + guest_id +
                    "', opn_Choice='" + guest_choice +
                    "', winner='" + host_id +
                    "' , status= 2 WHERE id=" + room_id, async() => {
                        let newCredithost = current_credit_host + bet + (bet - (bet * vat_games / 100));
                        con.query("update player set current_balance =" +
                            "'" + newCredithost + "' where player_id = " +
                            "'" + host_id + "'");
                        // //update credit guest
                        let newCreditguest = current_credit_guest - bet;
                        con.query("update player set current_balance =" +
                            "'" + newCreditguest + "' where player_id = " +
                            "'" + guest_id + "'");

                        con.query("SELECT count(*) rc FROM heads_tails_log WHERE  status= 1", (err, res1) => {
                            new_rc = res1[0].rc;
                            con.query("SELECT count(*) as mrc FROM heads_tails_log WHERE  status= 1 and user_id =" + "'" + host_id + "'",
                                (err, res2) => {
                                    new_mrc = res2[0].mrc;
                                    socket.emit('onVsclick_res', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        result: 'lose'
                                    });
                                    socket.to(room).emit(host_id + 'win', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        new_rc: new_rc,
                                        new_mrc: new_mrc
                                    });
                                    io.in(room).emit('remove_display', { room_id: room_id, host_id: host_id, new_rc: new_rc });
                                });
                        });
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + host_id + ",'" + host_name + "')");
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + guest_id + ",'" + guest.first_name + "')");
                        let mystathost = await doViewMydata(host_id, room);
                        let mystatguest = await doViewMydata(guest_id, room);
                        socket.to(room).emit('stat' + host_id, { mystat: mystathost, newCredit: newCredithost });
                        socket.emit('stat' + guest_id, { mystat: mystatguest, newCredit: newCreditguest });
                    });
            });
        } else if (room == 'yingchub') {
            socket.emit('check', 'win');
            con.query("SELECT * FROM player WHERE player_id =" + host_id, async(err, host) => {
                let current_credit_host = parseFloat(host[0].current_balance);
                let current_credit_guest = current_credit;
                con.query("UPDATE paoyingchub_log SET  opn_name=" +
                    "'" + guest.first_name +
                    "', opn_id='" + guest_id +
                    "', opn_Choice='" + guest_choice +
                    "', winner='" + host_id +
                    "' , status= 2 WHERE id=" + room_id, async() => {
                        con.query("SELECT count(*) rc FROM paoyingchub_log WHERE  status= 1", (err, res1) => {
                            new_rc = res1[0].rc;
                            con.query("SELECT count(*) as mrc FROM paoyingchub_log WHERE  status= 1 and user_id =" + "'" + host_id + "'",
                                async(err, res2) => {
                                    new_mrc = await res2[0].mrc;
                                    await socket.emit('onVsclick_res', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        result: 'lose'
                                    });
                                    await socket.to(room).emit(host_id + 'win', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        new_rc: await new_rc,
                                        new_mrc: await new_mrc
                                    });
                                    await io.in(room).emit('remove_display', {
                                        room_id: room_id,
                                        host_id: host_id,
                                        new_rc: await new_rc
                                    });
                                });
                        });
                        let newCredithost = current_credit_host + bet + (bet - (bet * vat_games / 100));
                        con.query("update player set current_balance =" +
                            "'" + newCredithost + "' where player_id = " +
                            "'" + host_id + "'");
                        // //update credit guest
                        let newCreditguest = current_credit_guest - bet;
                        con.query("update player set current_balance =" +
                            "'" + newCreditguest + "' where player_id = " +
                            "'" + guest_id + "'");
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + host_id + ",'" + host_name + "')");
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + guest_id + ",'" + guest.first_name + "')");
                        let mystathost = await doViewMydata(host_id, room);
                        let mystatguest = await doViewMydata(guest_id, room);
                        socket.to(room).emit('stat' + host_id, { mystat: mystathost, newCredit: newCredithost });
                        socket.emit('stat' + guest_id, { mystat: mystatguest, newCredit: newCreditguest });
                    });
            });
        }
    }

    function hostlose(host_id, host_name, host_choice, guest_choice, room_id, bet, room) {
        let new_rc;
        let new_mrc;
        let guest_id = user_id;
        if (room == 'high_low') {
            con.query("SELECT * FROM player WHERE player_id =" + host_id, async(err, host) => {
                let current_credit_host = parseFloat(host[0].current_balance);
                let current_credit_guest = current_credit;
                con.query("UPDATE high_low_log SET  opn_name=" +
                    "'" + guest.first_name +
                    "', opn_id='" + guest_id +
                    "', opn_Choice='" + guest_choice +
                    "', winner='" + guest_id +
                    "' , status= 2 WHERE id=" + room_id, async() => {
                        let newCredithost = current_credit_host;
                        con.query("update player set current_balance =" +
                            "'" + newCredithost + "' where player_id = " +
                            "'" + host_id + "'");
                        // //update credit guest
                        let newCreditguest = current_credit_guest + (bet - (bet * vat_games / 100));
                        con.query("update player set current_balance =" +
                            "'" + newCreditguest + "' where player_id = " +
                            "'" + guest_id + "'");

                        con.query("SELECT count(*) rc FROM high_low_log WHERE  status= 1", (err, res1) => {
                            new_rc = res1[0].rc;
                            con.query("SELECT count(*) as mrc FROM high_low_log WHERE  status= 1 and user_id =" + "'" + host_id + "'",
                                (err, res2) => {
                                    new_mrc = res2[0].mrc;
                                    socket.emit('onVsclick_res', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        result: 'win'
                                    });
                                    socket.to(room).emit(host_id + 'lose', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        new_rc: new_rc,
                                        new_mrc: new_mrc
                                    });
                                    io.in(room).emit('remove_display', { room_id: room_id, host_id: host_id, new_rc: new_rc });
                                });
                        });
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + host_id + ",'" + host_name + "')");
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + guest_id + ",'" + guest.first_name + "')");
                        let mystathost = await doViewMydata(host_id, room);
                        let mystatguest = await doViewMydata(guest_id, room);
                        socket.to(room).emit('stat' + host_id, { mystat: mystathost, newCredit: newCredithost });
                        socket.emit('stat' + guest_id, { mystat: mystatguest, newCredit: newCreditguest });
                    });
            });
        } else if (room == 'head_tail') {
            con.query("SELECT * FROM player WHERE player_id =" + host_id, async(err, host) => {
                let current_credit_host = parseFloat(host[0].current_balance);
                let current_credit_guest = current_credit;
                con.query("UPDATE heads_tails_log SET  opn_name=" +
                    "'" + guest.first_name +
                    "', opn_id='" + guest_id +
                    "', opn_Choice='" + guest_choice +
                    "', winner='" + guest_id +
                    "' , status= 2 WHERE id=" + room_id, async() => {
                        let newCredithost = current_credit_host;
                        con.query("update player set current_balance =" +
                            "'" + newCredithost + "' where player_id = " +
                            "'" + host_id + "'");
                        // //update credit guest
                        let newCreditguest = current_credit_guest + (bet - (bet * vat_games / 100));
                        con.query("update player set current_balance =" +
                            "'" + newCreditguest + "' where player_id = " +
                            "'" + guest_id + "'");

                        con.query("SELECT count(*) rc FROM heads_tails_log WHERE  status= 1", (err, res1) => {
                            new_rc = res1[0].rc;
                            con.query("SELECT count(*) as mrc FROM heads_tails_log WHERE  status= 1 and user_id =" + "'" + host_id + "'",
                                (err, res2) => {
                                    new_mrc = res2[0].mrc;
                                    socket.emit('onVsclick_res', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        result: 'win'
                                    });
                                    socket.to(room).emit(host_id + 'lose', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        new_rc: new_rc,
                                        new_mrc: new_mrc
                                    });
                                    io.in(room).emit('remove_display', { room_id: room_id, host_id: host_id, new_rc: new_rc });
                                });
                        });
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + host_id + ",'" + host_name + "')");
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + guest_id + ",'" + guest.first_name + "')");
                        let mystathost = await doViewMydata(host_id, room);
                        let mystatguest = await doViewMydata(guest_id, room);
                        socket.to(room).emit('stat' + host_id, { mystat: mystathost, newCredit: newCredithost });
                        socket.emit('stat' + guest_id, { mystat: mystatguest, newCredit: newCreditguest });
                    });
            });
        } else if (room == 'yingchub') {
            socket.emit('check', 'lose');
            con.query("SELECT * FROM player WHERE player_id =" + host_id, async(err, host) => {
                let current_credit_host = parseFloat(host[0].current_balance);
                let current_credit_guest = current_credit;
                con.query("UPDATE paoyingchub_log SET  opn_name=" +
                    "'" + guest.first_name +
                    "', opn_id='" + guest_id +
                    "', opn_Choice='" + guest_choice +
                    "', winner='" + guest_id +
                    "' , status= 2 WHERE id=" + room_id, async() => {
                        let newCredithost = current_credit_host;
                        con.query("update player set current_balance =" +
                            "'" + newCredithost + "' where player_id = " +
                            "'" + host_id + "'");
                        // //update credit guest
                        let newCreditguest = current_credit_guest + (bet - (bet * vat_games / 100));
                        con.query("update player set current_balance =" +
                            "'" + newCreditguest + "' where player_id = " +
                            "'" + guest_id + "'");
                        con.query("SELECT count(*) rc FROM paoyingchub_log WHERE  status= 1", async(err, res1) => {
                            new_rc = res1[0].rc;
                            con.query("SELECT count(*) as mrc FROM paoyingchub_log WHERE  status= 1 and user_id =" + "'" + host_id + "'",
                                async(err, res2) => {
                                    new_mrc = await res2[0].mrc;
                                    await socket.emit('onVsclick_res', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        result: 'win'
                                    });
                                    await socket.to(room).emit(host_id + 'lose', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        new_rc: await new_rc,
                                        new_mrc: await new_mrc
                                    });
                                    await io.in(room).emit('remove_display', {
                                        room_id: room_id,
                                        host_id: host_id,
                                        new_rc: await new_rc
                                    });
                                });
                        });
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + host_id + ",'" + host_name + "')");
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + guest_id + ",'" + guest.first_name + "')");
                        let mystathost = await doViewMydata(host_id, room);
                        let mystatguest = await doViewMydata(guest_id, room);
                        socket.to(room).emit('stat' + host_id, { mystat: mystathost, newCredit: newCredithost });
                        socket.emit('stat' + guest_id, { mystat: mystatguest, newCredit: newCreditguest });
                    });
            });
        }
    }

    function draw(host_id, host_name, host_choice, guest_choice, room_id, bet, room) {
        let new_rc;
        let new_mrc;
        let guest_id = user_id;
        if (room == 'yingchub') {
            con.query("SELECT * FROM player WHERE player_id =" + host_id, async(err, host) => {
                let current_credit_host = parseFloat(host[0].current_balance);
                let current_credit_guest = current_credit;
                con.query("UPDATE paoyingchub_log SET  opn_name=" +
                    "'" + guest.first_name +
                    "', opn_id='" + guest_id +
                    "', opn_Choice='" + guest_choice +
                    "', winner = 0" +
                    ", status= 2 WHERE id=" + room_id, async() => {
                        let newCredithost = current_credit_host + bet;
                        con.query("update player set current_balance =" +
                            "'" + newCredithost + "' where player_id = " +
                            "'" + host_id + "'");
                        // //update credit guest
                        let newCreditguest = current_credit_guest;
                        con.query("update player set current_balance =" +
                            "'" + newCreditguest + "' where player_id = " +
                            "'" + guest_id + "'");

                        con.query("SELECT count(*) rc FROM paoyingchub_log WHERE  status= 1", async(err, res1) => {
                            new_rc = res1[0].rc;
                            con.query("SELECT count(*) as mrc FROM paoyingchub_log WHERE  status= 1 and user_id =" + "'" + host_id + "'",
                                async(err, res2) => {
                                    new_mrc = await res2[0].mrc;
                                    await socket.emit('onVsclick_res', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        result: 'draw'
                                    });
                                    await socket.to(room).emit(host_id + 'draw', {
                                        host_name: host_name,
                                        guest_name: guest.first_name,
                                        room_id: room_id,
                                        bet: bet,
                                        host_choice: host_choice,
                                        guest_choice: guest_choice,
                                        new_rc: await new_rc,
                                        new_mrc: await new_mrc
                                    });
                                    await io.in(room).emit('remove_display', {
                                        room_id: room_id,
                                        host_id: host_id,
                                        new_rc: await new_rc
                                    });
                                });
                        });
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + host_id + ",'" + host_name + "')");
                        con.query("INSERT INTO high_low_user(user_id,user_name) VALUES (" + guest_id + ",'" + guest.first_name + "')");
                        let mystathost = await doViewMydata(host_id, room);
                        let mystatguest = await doViewMydata(guest_id, room);
                        socket.to(room).emit('stat' + host_id, { mystat: mystathost, newCredit: newCredithost });
                        socket.emit('stat' + guest_id, { mystat: mystatguest, newCredit: newCreditguest });
                    });
            });
        }

    }

    async function doViewMydata(user_id, room) {
        if (room == 'high_low') {
            return new Promise(resolve => {
                let top20 = [];
                con.query("SELECT * FROM high_low_log WHERE opn_id=" + user_id + " and status =2 or user_id=" + user_id + " and status =2  ORDER BY ID DESC LIMIT 20",
                    async(err, res) => {
                        for (let i = 0; i < res.length; i++) {
                            let host_bet = res[i].user_Choice.split("");
                            let hi_lo = parseInt(host_bet[0]) + parseInt(host_bet[1]) + parseInt(host_bet[2]);
                            if (hi_lo > 10) {
                                host_bet[3] = 1;
                            } else {
                                host_bet[3] = 2;
                            }
                            let intop = {
                                room_id: res[i].id,
                                winner_uid: res[i].winner,
                                host_uid: res[i].user_id,
                                guest_uid: res[i].opn_id,
                                host_choice: host_bet,
                                guest_choice: res[i].opn_Choice,
                                host_name: res[i].user_name,
                                guest_name: res[i].opn_name,
                                bet: res[i].bet,
                                match_dt: res[i].created_date
                            };
                            top20.push(intop);
                        }
                        resolve(top20);
                    });
            });
        } else if (room == 'head_tail') {
            socket.emit('check', 'dov');
            return new Promise(resolve => {
                let top20 = [];
                con.query("SELECT * FROM heads_tails_log WHERE opn_id=" + user_id + " and status =2 or user_id=" + user_id + " and status =2  ORDER BY ID DESC LIMIT 20",
                    async(err, res) => {
                        for (let i = 0; i < res.length; i++) {
                            let host_bet = res[i].user_Choice;
                            let intop = {
                                room_id: res[i].id,
                                winner_uid: res[i].winner,
                                host_uid: res[i].user_id,
                                guest_uid: res[i].opn_id,
                                host_choice: host_bet,
                                guest_choice: res[i].opn_Choice,
                                host_name: res[i].user_name,
                                guest_name: res[i].opn_name,
                                bet: res[i].bet,
                                match_dt: res[i].created_date
                            };
                            top20.push(intop);
                        }
                        resolve(top20);
                    });
            });
        } else if (room == 'yingchub') {
            return new Promise(resolve => {
                let top20 = [];
                con.query("SELECT * FROM paoyingchub_log WHERE opn_id=" + user_id + " and status =2 or user_id=" + user_id + " and status =2  ORDER BY ID DESC LIMIT 20",
                    async(err, res) => {
                        for (let i = 0; i < res.length; i++) {
                            let host_bet = res[i].user_Choice;
                            let intop = {
                                room_id: res[i].id,
                                winner_uid: res[i].winner,
                                host_uid: res[i].user_id,
                                guest_uid: res[i].opn_id,
                                host_choice: host_bet,
                                guest_choice: res[i].opn_Choice,
                                host_name: res[i].user_name,
                                guest_name: res[i].opn_name,
                                bet: res[i].bet,
                                match_dt: res[i].created_date
                            };
                            top20.push(intop);
                        }
                        resolve(top20);
                    });
            });
        }

    }

    function dotop20() {
        return new Promise(async resolve => {

            let today = new Date();
            let time_start = '00:00:00';
            let time_end = '23:59:00';
            let create_date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + (today.getDate() - 1);
            let yester_day_s = create_date + ' ' + time_start;
            let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + (today.getDate() - 1);
            let yester_day_e = date + ' ' + time_end;
            let topt = [];
            let top20 = [];

            await con.query("SELECT * FROM high_low_user", async(err, res) => {
                for (let i = 0; i < res.length; i++) {
                    await top20.push({ username: res[i].user_name, id: res[i].user_id, win: 0, lose: 0 });
                    await con.query("SELECT * FROM high_low_log WHERE  user_id =" + res[i].user_id + " AND created_date BETWEEN  '" + yester_day_s + "' AND '" + yester_day_e + "'" +
                        "OR opn_id = " + res[i].user_id + " AND created_date BETWEEN  '" + yester_day_s + "' AND '" + yester_day_e + "'", async(err, res1) => {
                            for (let I = 0; I < res1.length; I++) {
                                if (res1[I].winner == res[i].user_id) {
                                    top20[I].win++;
                                } else if (res1[I].winner != res[i].user_id) {
                                    top20[I].lose++;
                                }
                            }
                        });
                }
                resolve(top20);
            });
        });
    }

    async function checkCredit(credit, bet) {

        if ((credit - bet) < 0) {
            socket.emit('outCredit', );
            return 0;
            // process.exit(1)
        } else {
            return 1;
        }
    }
});

function numTochar(num) {
    let choice = '';
    switch (num) {
        case 1:
            choice = 'h';
            break;
        case 2:
            choice = 'l';
            break;
    }
    return choice;
}

function numTochar_headtail(num) {
    let choice = '';
    switch (num) {
        case 1:
            choice = 'h';
            break;
        case 2:
            choice = 't';
            break;
    }
    return choice;
}

function numTochar_yingchub(num) {
    let choice = '';
    switch (num) {
        case 1:
            choice = 'r';
            break;
        case 2:
            choice = 's';
            break;
        case 3:
            choice = 'p';
            break;
    }
    return choice;
}

http.listen(PORT, function() {
    console.log('start server on port :' + PORT);
});