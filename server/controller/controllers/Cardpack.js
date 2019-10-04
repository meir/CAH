const response = require('../../response');
const User = require('../../user');
const validator = require('../../validator');
const uuidv4 = require('uuid/v4');

module.exports = {
    getCardpacks: (req, res) => {
        req.db.sync(function (err) {
            if (err) {
                response(res, req.body, {}, 500, "Error while synchronizing database.", [])
                return
            }

            req.models.cardpack.all((err, cardpacks) => {
                if (err) {
                    response(res, req.body, {}, 500, "Error while fetching cardpacks.", [])
                    return
                }

                response(res, req.body, cardpacks, 200, "Fetched all cardpacks", [])
            })
        })
    },

    createCardpack: (req, res) => {
        User(req, (user, err) => {
            if (err) {
                response(res, req.body, {}, 500, "Error while checking if user is authenticated", [errors.New("", errors.code.DatabaseError, err)])
                return
            }
            if (user) {
                let [success, err] = validator(req.body, {
                    "name": "string",
                    "description": "string",
                })

                if (success) {
                    req.db.sync(function (err) {
                        if (err) {
                            response(res, req.body, {}, 500, "Unexpected error while synchronizing database.", [err])
                            return
                        }

                        req.models.cardpack.create({
                            uuid: uuidv4(),
                            user_id: user.id,
                            name: req.body.name,
                            description: req.body.description,
                            tags: JSON.stringify(req.body.tags),
                            likes: 0
                        }, (err, result) => {
                            if (err) {
                                response(res, req.body, {}, 500, "Unexpected error while requesting users from database.", [err])
                                return
                            }

                            response(res, req.body, result, 200, "Cardpack created", [err])
                            return
                        })
                    })
                } else {
                    response(res, req.body, {}, 400, "Request did not validate to required parameters and its rules", err)
                }
            }
        })
    },

    addLike: (req, res) => {
        User(req, (user, err) => {
            if (err) {
                response(res, req.body, {}, 500, "Error while checking if user is authenticated", [errors.New("", errors.code.DatabaseError, err)])
                return
            }
            if (user) {
                req.db.sync(function (err) {
                    if (err) {
                        response(res, req.body, {}, 500, "Unexpected error while synchronizing database.", [err])
                        return
                    }

                    req.models.cardpack.find({ id: req.body.currentPack }, (err, results) => {
                        let liked_packs = JSON.parse(user.liked_packs)
                        let cardpack = results[0]

                        if (liked_packs === null) {
                            liked_packs = []
                        }

                        if (liked_packs.includes(cardpack.id)) {
                            cardpack.likes -= 1

                            liked_packs = liked_packs.filter(item => {
                                return item !== cardpack.id
                            })

                            user.liked_packs = JSON.stringify(liked_packs)

                        } else {
                            cardpack.likes += 1

                            liked_packs.push(req.body.currentPack)
                            user.liked_packs = JSON.stringify(liked_packs)
                        }

                        cardpack.save()

                        user.save()

                        response(res, req.body, {}, 200, "User liked cardpack", [])
                        return
                    })
                })

            }
        })
    }
}