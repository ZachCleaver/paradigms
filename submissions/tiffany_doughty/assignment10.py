def map(list, func):
	crazyStuffList = []
	counter = 0
	while counter<len(list):
		crazyStuffList.append(func(list[counter]))
		counter = counter+1
	return crazyStuffList

print (map(range(999), lambda p:p*p))
