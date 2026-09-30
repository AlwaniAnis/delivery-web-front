function validate(model, fileds) {
  let errors = [];
  fileds.map((f) => {
    let k = Object.keys(f)[0];
    if (!model[k]) errors.push(f[k]);
  });

  var msg = errors.length
    ? errors.length == 1
      ? "le champ : " + errors[0] + " est obligatoire"
      : "les champs : " + errors.join(" , ") + " sont obligatoires"
    : "";
  return msg;
}
export default validate;
