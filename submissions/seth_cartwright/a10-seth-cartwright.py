def map(incomingList, func):
	# -takes in a list of ints
	# -takes in a function
	# -sends each incoming list element through the function, which
	# returns the square of the element
	# -saves each returned square into a new list
	# -returns new list of squared ints
	newList = []
	i = 0
	while i < len(incomingList):
		newList.append(func(incomingList[i]))
		i = i+1
	return newList
	
print(map(range(1000), lambda x: x*x))
