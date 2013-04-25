def map(list, func):
	L = []
	for i in list:
		L.append(func(i))
	return L	

print(map(range(1000),lambda x: x**2))
