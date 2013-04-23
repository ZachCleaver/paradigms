def map(alist, afunction):
  rlist = []
  for i in range(len(alist)):
    rlist.append(afunction(alist[i]))
  return rlist

def square(num):
  return num*num

print(map(range(1000),square))