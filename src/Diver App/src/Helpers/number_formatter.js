export default function format_number(x = 0) {
  let s = x.toFixed(3).toString();
  let left_part = s.split(".")[0];
  let right_part = s.split(".")[1];
  let output = "";
  let reverse = left_part.split("").reverse().join("");
  if (left_part.length > 3) {
    for (let i = 0; i < left_part.length; i = i + 3) {
      output = [reverse.slice(0, i), " ", reverse.slice(i)].join("");
    }
    return output.split("").reverse().join("") + "," + right_part;
  } else return s;
}
