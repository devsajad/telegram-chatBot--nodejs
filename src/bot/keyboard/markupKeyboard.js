function createKeyboard(buttons) {
  return {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
}


export function StartBtn() {
  const startBtn = [[{ text: "لا چاکت 🥸🔪" }, { text: "هات چاکلت 🍫🔥" }]];

  return createKeyboard(startBtn);
}
