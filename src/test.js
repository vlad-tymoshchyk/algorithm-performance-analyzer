console.log('starts here');
function bubleSort(arr) {
  let temp = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = 0; j < arr.length - 1 - i; j++) {
      console.log(
        'j, j + 1',
        j,
        j + 1,
        arr[j] > arr[j + 1],
        arr[j],
        arr[j + 1]
      );
      if (arr[j] > arr[j + 1]) {
        temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}
const testArr = [3, 2, 1, 4, 9, 6, 7, 8, 5];
console.log(testArr);
console.log(bubleSort(testArr));
