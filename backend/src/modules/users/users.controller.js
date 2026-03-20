const { successResponse } = require("../../utils/apiResponse");
const usersService = require("./users.service");

async function listUsers(req, res, next) {
  try {
    const users = await usersService.listUsers(req.user);
    res.json(successResponse(users, "Users fetched"));
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await usersService.createUser(req.user, req.body, req.ip);
    res.status(201).json(successResponse(user, "User created"));
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await usersService.getUserById(req.user, req.params.id);
    res.json(successResponse(user, "User fetched"));
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await usersService.updateUser(req.user, req.params.id, req.body, req.ip);
    res.json(successResponse(user, "User updated"));
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const data = await usersService.softDeleteUser(req.user, req.params.id, req.ip);
    res.json(successResponse(data, "User deactivated"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser
};
