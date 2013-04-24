def map(func, list):
	returnlist = []
	for number in list:
		returnlist.append(func(number))
	return returnlist

print map(lambda x: x*x, range(1000))

# Just used to pause the output window 
# so I can view the results
raw_input()