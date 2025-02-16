import User from "../models/User.js"; // Import the User model

export default async function createUserToDB(
  id,
  firstName,
  lastName,
  userName
) {
  try {
    let user = await User.findOne({ telegramId: id }); // Check if user exists
    if (!user) {
      // If the user does not exist, create a new user entry
      user = new User({
        telegramId: id,
        firstName: firstName,
        lastName: lastName || "",
        username: userName || "",
      });

      await user.save();
      console.log(`New user added: ${userName || firstName}`);
    } else {
      console.log(`Existing user found: ${userName || firstName}`);
    }
  } catch (error) {
    console.log("Create User to DB problem : ", error);
  }
}
